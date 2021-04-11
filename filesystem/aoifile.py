import os
import shutil
from types import prepare_class
from aoidb.database import AoiDB2 as AoiDB
from pathtree import PathTree
from _sha3 import shake_256 as sha
from time import ctime
from pickle import dump,load


encode = lambda x: bytes(x,encoding='utf-8')
decode = lambda x: bytes.decode(x)
str_to_sha = lambda x: sha(encode(x)).hexdigest(10)

class AoiFile:
  def __init__(self, datadir='./'):
    self.__db = AoiDB()
    self.__tree = PathTree(datadir)
    self.datadir = datadir
    self.path = datadir+'/root'

    if not os.path.isdir(self.path):
      os.makedirs(self.path)
    if os.path.isfile(f'{datadir}/db.aoi2'):
      self.__db.load(f'{datadir}/db.aoi2')
      with open(f'{self.datadir}/db.aoi2.map', 'rb') as f:
        self.__tree = load(f)
    else:
      self.__db.add_col('name',str())
      self.__db.add_col('size',int())
      self.__db.add_col('hash',str())
      self.__db.add_col('path',str())
      self.__db.add_col('type',str())
      self.__db.add_col('tag',str(),multi_value=True)
      self.__db.add_col('description',str())
      self.__db.add_col('uploader',str())
      self.__db.add_col('owner',str(),multi_value=True)
      self.__db.add_col('his',str())
      self.__db.add_data(
        name = 'root',
        path = '',
        type = 'folder'
      )
    if not self.__db.get(name='public',path=''):
      self.create_dir(
        'public',
        root=''
      )
    if not self.__db.get(name='personal',path=''):
      self.create_dir(
        'personal',
        root=''
      )
    print(self.__db)
    self.save_db()
  
  def save_db(self):
    self.__db.save(f'{self.datadir}/db')
    with open(f'{self.datadir}/db.aoi2.map', 'wb') as f:
      dump(self.__tree, f)
  
  def path2id(self,path):
    if path=='':
      return 1
    res = self.__tree[path]
    if type(res)==PathTree:
      return self.__db.get(path=path,type='folder')[0].id
    return self.__tree[path]
  
  def hash2id(self, hash):
    data = self.__db.get(hash=hash)
    if data:
      return data[0].id
    else:
      return 0

  def create_dir(self, target, **properties):
    now = properties['root']
    if now:
      now += '/'
    now += target
    if not os.path.isdir(self.path+'/'+now):
      if os.path.isfile(self.path+'/'+now):
        raise ValueError(f'{now} is a file.')
      os.makedirs(self.path+'/'+now)
      self.__tree.new_tree(now)

      data = self.__db.add_data(
        name = target,
        path = now,
        type = 'folder',
        description = properties.get('description',''),
        uploader = properties.get('uploader',''),
        owner = [properties.get('uploader','')],
        his = f'[{ctime()}] add into system.\n'
      )
      id = data.id
      self.__db.change_value(id,hash=str_to_sha(f'{data.id}_{data["name"]}'))
    self.save_db()

  def add_file(self, name, path, target_dir, **properties):
    with open(path, 'rb') as f:
      data = f.read()
      sha_hash = sha(data).hexdigest(16)

    if target_dir != '':
      if not self.__db.get(path=target_dir,type='folder'):
        raise ValueError(f'You should create dir "{target_dir}" first!')
      
      target = f'{self.path}/{target_dir}/{name}'
      target_path = f'{target_dir}/{name}'
    else:
      target = f'{self.path}/{name}'
      target_path = f'{name}' 

    if os.path.isfile(target):
      shutil.copy(path, target)
      file = self.__db.get(id = self.path2id(target_path))
      if file['hash']!=sha_hash:
        self.__db.change_value(
          id = file.id,
          size = len(data),
          hash = sha_hash,
          his = f'{file["his"]}'+f'[{ctime()}] replaced\n',
          **properties
        )
      else:
        self.__db.change_value(
          id = file.id,
          his = f'{file["his"]}'+f'[{ctime()}] update by replace\n',
          **properties
        )
    else:
      shutil.copy(path, target)
      file = self.__db.add_data(  
        name = name,
        size = len(data),
        hash = sha_hash,
        path = f'{target_dir}/{name}',
        owner = [properties.get('uploader', '')],
        his = f'[{ctime()}] add into system\n',
        **properties
      )

    self.__tree[target_path] = file.id
    self.save_db()
  
  def del_file(self, id):
    file = self.__db.get(id=id)
    if file['type']=='folder':
      raise TypeError(f'ID:{id} is a Folder')
    os.remove(f'{self.path}/{file["path"]}')
    self.__db.delete(file.id)
    self.__tree.delete(file["path"].strip('/'))
    self.save_db()

  def del_folder(self, id):
    folder = self.__db.get(id=id)
    if folder['type']!='folder':
      raise TypeError(f'ID:{id} is not a Folder')
    
    shutil.rmtree(f'{self.path}/{folder["path"]}')
    path = folder["path"].strip('/')

    tree = self.__tree[path]
    dirs = list(tree.get_dir())
    all_dir = [path]
    datas = list(tree.get_data())

    while dirs:
      now_path = dirs.pop(0)
      now_tree = tree[now_path]
      all_dir.append(f'{path}/{now_path}')

      new_dirs = [f'{now_path}/{i}' for i in now_tree.get_dir()]
      new_datas = now_tree.get_data()
      datas += new_datas
      dirs += new_dirs
    datas += [self.__db.get(path=i,type='folder')[0].id for i in all_dir]

    for item in datas:
      self.__db.delete(item)
    self.__tree.delete(path,True)
    self.save_db()

  def get_file(self, id):
    return f'{self.path}/{self.__db.get(id=id)["path"]}'
  
  def get_properties(self, id):
    data = self.__db.get(id=id)
    properties = {
      'id': data.id
    }
    for i,j in data.items():
      properties[i] = j
    return properties
  
  def set_properties(self, id, properties):
    data = self.__db.get(id=id)

    if 'name' in properties:
      new_name = properties['name']
      path = f'{data["path"]}/{new_name}'
      
      if new_name.find('.')==-1 and data["name"].count('.'):
        sub = data["name"].split('.')[-1]
        path = f'{data["path"]}/{new_name}.{sub}'
        properties["name"] = f'{new_name}.{sub}'
      
      shutil.move(f'{data["path"]}/{data["name"]}',path)
    if 'path' in properties:
      del properties['path']

    properties['his'] = data['his']+f'\n[{ctime()}] change properties.'
    self.__db.change_value(id, **properties)
    self.save_db()
    return 'success'
  
  def get_item_under_path(self, path_id):
    path = self.__db.get(id=path_id)
    if path_id==1:
      files = self.__tree.get_data()
      dirs = self.__tree.get_dir()
    else:
      files = self.__tree[path['path']].get_data()
      dirs = self.__tree[path['path']].get_dir()

    data = {'files': [], 'dirs': []}
    for i in files:
      file_info = dict(self.__db.get(id=i))
      file_info['id'] = i
      data['files'].append(file_info)
    
    for i in dirs:
      temp = self.__db.get(path=path['path']+'/'+i,type='folder')[0]
      dir_info = {i:j for i,j in temp.items()}
      dir_info['id'] = temp.id
      data['dirs'].append(dir_info)
    return data