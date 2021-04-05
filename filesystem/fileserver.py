from aoifile import AoiFile
from fastapi import FastAPI, Query, Body
from sys import argv
from traceback import format_exc
from json import load
import functools

def log_error(err):
  print(err)
  try:
    errors = err.split('File')[1:]
    errors[-1], error_mes = '\n'.join(errors[-1].split('\n')[:2]), errors[-1][2]

    error_message = ''
    for i in errors:
      if i[:3]!= ' "c':
        error_message += 'File'+i
    err_cls, err_mes = error_mes.split(': ',1)
    print(
      '====Error Occured====\n',
      'Error Trace  : \n  {}\n\n'.format(error_message),
      'Error Class  : {}\n'.format(err_cls),
      'Error Message: {}\n'.format(err_mes),
      '=====================',
      sep=''
    )
  except:
    pass

def error_handler(func):
  @functools.wraps(func)
  async def function(*args,**kwargs):
    try:
      return (await func(*args, **kwargs))
    except:
      err = format_exc()
      log_error(err)
      return 'Internal Server Error'
  return function


with open('config.json','r',encoding='utf-8') as f:
  config = load(f)

fs = AoiFile(config['data_dir'])
app = FastAPI()

@app.get("/")
async def root():
  return {"message": "Hello World"}

@app.post("/get_info")
@error_handler
async def get_info(payload: dict = Body(...)):
  data = fs.get_properties(payload['file_id'])
  return data 

@app.post("/set_info")
@error_handler
async def set_info(payload: dict = Body(...)):
  fs.set_properties(payload['file_id'], payload['properties'])
  return 'success'

@app.post("/add_file")
@error_handler
async def add_file(payload: dict = Body(...)):
  name = payload['name']
  path = payload['path']
  target_dir = payload['target_dir']
  properties = payload['properties']
  fs.add_file(name = name, path=path, target_dir=target_dir, **properties)
  return 'success'

@app.post("/create_dir")
@error_handler
async def create_dir(payload: dict = Body(...)):
  fs.create_dir(payload['target'],**payload['properties'])
  return 'success'

@app.post("/get_file")
@error_handler
async def get_file(payload: dict = Body(...)):
  return fs.get_file(payload['file_id'])

@app.post("/del_file")
@error_handler
async def del_file(payload: dict = Body(...)):
  fs.del_file(payload['file_id'])
  return 'success'

@app.post("/del_folder")
@error_handler
async def del_file(payload: dict = Body(...)):
  fs.del_folder(payload['file_id'])
  return 'success'

@app.post("/get_items")
@error_handler
async def get_items(payload: dict = Body(...)):
  return fs.get_item_under_path(payload['path_id'])

@app.post("/path2id")
@error_handler
async def path2id(payload: dict = Body(...)):
  return fs.path2id(payload['file_path'])

@app.post("/hash2id")
@error_handler
async def path2id(payload: dict = Body(...)):
  return fs.hash2id(payload['hash'])
