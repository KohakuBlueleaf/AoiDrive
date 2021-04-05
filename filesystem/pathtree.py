class PathTree:
  __slots__ = ['name','__dir','__data']
  def __init__(self, name='root'):
    self.name = name
    self.__data = {}
    self.__dir = {}

  def __str__(self):
    pass
  
  def __getitem__(self, key:str):
    keys = key.split('/')
    last_key = keys[-1]

    now = self
    for i in keys[:-1]:
      if i not in now.__dir:
        raise KeyError(f'{key} dosen\'t exist.')
      else:
        now = now.__dir[i]
    
    if last_key in now.__dir:
      return now.__dir[last_key]
    elif last_key in now.__data:
      return now.__data[last_key]
    else:
      raise KeyError(f'{key} dosen\'t exist.')

  def __setitem__(self, key:str, value):
    if type(value) == PathTree:
      raise TypeError('The type of the value cannot be a PathTree.')
    keys = key.split('/')
    last_key = keys[-1]

    now = self
    for i in keys[:-1]:
      if i not in now.__dir:
        now.__dir[i] = PathTree(i)
        now = now.__dir[i]
      else:
        now = now.__dir[i]
    
    if last_key in now.__dir:
      raise KeyError('You cannot set a dir to another thing.')
    now.__data[last_key] = value
  
  def new_tree(self, key:str):
    keys = key.split('/')

    now = self
    for i in keys:
      if i not in now.__dir:
        now.__dir[i] = PathTree(i)
        now = now.__dir[i]
      else:
        now = now.__dir[i]

  def mkdir(self, key:str):
    keys = key.split('/')
    last_key = keys[-1]

    now = self
    for i in keys[:-1]:
      if i not in now.__dir:
        now.__dir[i] = PathTree(i)
        now = now.__dir[i]
      else:
        now = now.__dir[i]
    
    if last_key in now:
      raise KeyError('dir already exist.')
    now.__dir[last_key] = PathTree(last_key)

    return now.__dir[last_key]

  def delete(self, key:str, is_dir=False):
    keys = key.split('/')
    last_key = keys[-1]

    now = self
    for i in keys[:-1]:
      if i not in now.__dir:
        raise KeyError(f'{key} dosen\'t exist.')
      else:
        now = now.__dir[i]
    
    if last_key in now.__dir:
      if is_dir:
        del now.__dir[last_key]
      else:
        raise AttributeError('is_dir should be True if you want to delete a whole dir.')
    elif last_key in now.__data:
      del now.__data[last_key]
    else:
      raise KeyError(f'{key} dosen\'t exist.')
  
  def __contains__(self, key:str):
    keys = key.split('/')
    last_key = keys[-1]

    now = self
    for i in keys[:-1]:
      if i not in now.__dir:
        return False
      else:
        now = now.__dir[i]
    
    if last_key in now.__dir:
      return True
    elif last_key in now.__data:
      return True
    else:
      return False
  
  def size(self):
    queue = [self]
    res = 0
    while queue:
      now = queue.pop()
      res += 1
      queue += list(now.__dir.values())
    return res
    
  def items(self):
    pass

  def get_data(self):
    return tuple(self.__data.values())
  
  def get_dir(self):
    return tuple(self.__dir.keys())