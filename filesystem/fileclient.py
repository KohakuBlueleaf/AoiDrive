from requests import post
from json import loads,dumps

print_dict = lambda d:print(dumps(d,indent=2))
decode = lambda x: bytes.decode(x)


class FileClient:
  def __init__(self, port):
    self.url = f'http://127.0.0.1:{port}'

  def path2id(self, path):
    return int(post(f'{self.url}/path2id',json={'file_path':path}).content)
    
  def hash2id(self, hash):
    return int(post(f'{self.url}/hash2id',json={'hash':hash}).content)

  def get_info(self, id):
    data = loads(decode(post(f'{self.url}/get_info',json={'file_id':id}).content))
    return data

  def get_file(self, id):
    return loads(decode(post(f'{self.url}/get_file',json={'file_id':id}).content))

  def add_file(self, name, path, target_dir, **properties):
    post(f'{self.url}/add_file',json={
      'name': name,
      'path': path,
      'target_dir': target_dir,
      'properties': properties
    })

  def del_file(self, id):
    post(f'{self.url}/del_file',json={'file_id':id})
    
  def del_folder(self, id):
    post(f'{self.url}/del_folder',json={'file_id':id})

  def create_dir(self, target, **properties):
    post(f'{self.url}/create_dir',json={'target':target,'properties':properties})

  def set_info(self, file_id, **properties):
    post(f'{self.url}/set_info',json={
      'file_id': file_id,
      'properties': properties
    })
  
  def get_items(self, path_id):
    data = post(f'{self.url}/get_items',json={
      'path_id': path_id
    }).content
    return loads(decode(data))