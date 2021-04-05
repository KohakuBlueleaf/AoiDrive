from aioflask import Flask, render_template
from flask import session, request, url_for, redirect, flash, send_file, Response
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user

from filetype import guess

import os,sys,shutil
import re

import requests
from _sha3 import shake_256
from datetime import timedelta
from json import dump,load,loads

from filesystem.fileclient import FileClient
from aoidb.client import DataBaseClient

'''
utils
'''
encode = lambda x: bytes(x,encoding='utf-8')
decode = lambda x: bytes.decode(x)
str_to_sha = lambda x: shake_256(encode(x)).hexdigest(10)

def log_error(err, ignore_file_name=['discord\ext\commands']):
  all_mes = re.findall(r'File.*\n\s+.*',err)
  err_class, err_message = re.findall(r'.+: .+',err)[0].split(": ")

  output = '========Error Occured========\n'
  before_file = ''

  for i in all_mes:
    state, program = i.split('\n')
    err_file, err_line, err_pos = state.split(', ')

    for i in ignore_file_name:
      if err_file.find(i)!=-1:
        break
    else:
      if before_file:
        output += '-----------------------------\n'
      if err_file!=before_file:
        output += f'Error File   : {err_file[5:]}\n'
        before_file = err_file
      
      output += f'Error Line   : {err_line[5:]}\n'
      output += f'Error Pos    : {err_pos[3:]}\n'
      output += f'Error program: {program.strip()}\n'
  
  output += '=============================\n'
  output += f'Error Class  : {err_class}\n'
  output += f'Error Message: {err_message}\n'
  output += '============================='
  print(output)
'''
設定參數
'''
PATH = os.getcwd()
cache = 'cache'

with open('config.json','r',encoding='utf-8') as f:
  config = load(f)

file_sys = FileClient(config['filesystem_port'])
user_db = DataBaseClient(ip='127.0.0.1',port=38738)
print(user_db)

def has_user(uname):
  if uname is None:
    return False
  return bool(user_db.get(uname=uname))

app = Flask(__name__)
app.secret_key = os.urandom(16).hex()

'''
登入系統
'''
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.session_protection = "strong"
login_manager.login_view = 'login'

class User(UserMixin):
  pass

@login_manager.user_loader
def user_loader(uname):
  print(1,uname)
  if not has_user(uname):
    return

  user = User()
  user.id = uname
  user.uid = str_to_sha(uname)
  return user

@login_manager.request_loader
def request_loader(request):
  print(2,request.form.get('user_id'))
  uname = request.form.get('user_id')
  if not has_user(uname):
    return

  user = User()
  user.id = uname
  user.uid = str_to_sha(uname)

  passwd_hash = str_to_sha(request.form['password'])
  user.is_authenticated = passwd_hash == user_db.get(uname=uname)['passwd']
  return user


@app.route('/login', methods=['GET', 'POST'])
async def login():
  #當method為get的時候 回傳頁面
  if request.method == 'GET':
    if current_user.is_authenticated:
      return redirect('/')
    return await render_template("login.html")
  
  #method為post 進行登入驗證
  #獲取request中的username及passwd
  #將passwd做hash處理
  uname = request.form['user_id']
  passwd_hash = str_to_sha(request.form['password'])

  #用戶存在
  if has_user(uname):
    #檢查密碼
    if passwd_hash == user_db.get(uname=uname)[0]['passwd']:
      user = User()
      user.id = uname
      user.uid = str_to_sha(uname)
      login_user(user)
      return {'message':'success'}
    else:
      return {'message':'wrong passwd'}
  else:
    return {'message':'no account'}

#登出
@app.route('/logout')
@login_required
async def logout():
  logout_user()
  return redirect('/login')


'''
頁面部分
'''
@app.route("/", methods=['GET'])
async def root():
  return redirect('/public/')

@app.route("/public/<hash>", methods=['GET','POST'])
#@login_required
async def public_info(hash=''):
  if request.method == 'POST':
    return file_sys.get_items(file_sys.hash2id(hash))
  else:
    if request.headers['User-Agent'].find('Mobile')!=-1:
      return await render_template('home_media.html')
    return await render_template('home.html')

@app.route("/public/", methods=['GET','POST'])
#@login_required
async def public_home():
  if request.method == 'POST':
    return file_sys.get_items(2)
  else:
    if request.headers['User-Agent'].find('Mobile')!=-1:
      return await render_template('home_media.html')
    return await render_template('home.html')

@app.route("/public", methods=['GET'])
async def public_redirect():
  return redirect('/public/')
  
@app.route("/media/<variable>", methods=['GET','POST'])
#@login_required
async def media(variable):
  return await render_template('media_browser.html')

@app.route("/path/<hash>", methods=['POST'])
#@login_required
async def hash_path(hash=''):
  return file_sys.get_info(file_sys.hash2id(hash))

@app.route("/path2hash",methods=['POST'])
async def path2hash():
  path = request.form['path'].strip('/')
  if path:
    path = '/'+path
  field = request.form['field']
  if field == 'personal':
    return {}
  else:
    folder = file_sys.get_info(file_sys.path2id(field+path))
    return {'hash':folder['hash'],'is_field_root': path==''}
  
@app.route("/field/<field>", methods=['POST'])
#@login_required
async def hash_path_field(field=''):
  if field == 'public':
    return file_sys.get_info(2)
  else:
    return file_sys.get_info(3)

'''
檔案操作
'''
with open('filetype.json','r') as f:
  extension_table = load(f)
extension_table['docx'] = 'doc/docx'
extension_table['xlsx'] = 'excel/xlsx'
extension_table['pptx'] = 'ppt/pptx'
extension_table['zip'] = 'zip/zip'
extension_table['rar'] = 'zip/rar'
extension_table['7z'] = 'zip/7z'
extension_table['pdf'] = 'pdf/pdf'

def _get_type(file_name):
  extension = file_name.split('.')[-1]
  if extension in extension_table:
    return extension_table[extension]
  else:
    return f'None/{extension}'

def get_type(filename):
  file_type = guess(filename)
  if file_type is None:
    file_type = _get_type(filename)
    if file_type is None:
      file_type = f"None/{filename.split('.')[-1]}"
  else:
    file_type = file_type.mime

  if file_type.split('/')[0]=='application':
    file_type = _get_type(filename)
    if file_type is None:
      file_type = 'zip/zip'
  
  return file_type

def secure(filename):
  filename = filename.split('/')[-1].split('\\')[-1]
  for i in ":*|<>?!\"":
    filename = filename.replace(i, '')
  return filename

@app.route('/upload', methods=['POST'])
#@login_required
async def upload_file():
  if 'root_list' in request.form:
    new_dirs = loads(request.form['dirs'])

    for root, folders in new_dirs.items():
      root = root.strip('/')
      for folder in folders:
        folder = secure_folder(folder)
        file_sys.create_dir(
          folder,
          root=root,
        )

    root_list = loads(request.form['root_list'])
    files = request.files

    print(new_dirs)
    for i in root_list:
      print(i)
      file = files[i]
      root = root_list[i].strip('/')
      filename = secure(i)
      cache_path = os.path.join(PATH, cache, filename)
      file.save(cache_path)

      file_type = get_type(cache_path)
      file_sys.add_file(
        filename,
        cache_path,
        root,
        type=file_type
      )
      os.remove(cache_path)
    return {'success':'success'}
  else:
    files = [i for i in request.files.values()]
    form = request.form
    root = form['root'].strip('/')

    if files:
      for file in files:
        filename = secure(file.filename)
        cache_path = os.path.join(PATH, cache, filename)
        file.save(cache_path)

        file_type = get_type(cache_path)
        file_sys.add_file(
          filename,
          cache_path,
          root,
          tag=form['tag'].split('/'),
          description=form['des'],
          type=file_type
        )
        os.remove(cache_path)
      return {'success':'success'}
    else:
      return {'ignore':'ignore'}

@app.route('/thumbnail/<id>', methods=['GET'])
#@login_required
async def thumbnail(id):
  return send_file(file_sys.get_file((int(id))))

@app.route('/download/<variable>', methods=['GET'])
#@login_required
async def download(variable):
  path = file_sys.get_file(file_sys.hash2id(variable))
  return send_file(path, as_attachment=True)

@app.route('/delete/<variable>', methods=['GET'])
#@login_required
async def delete(variable):
  info = file_sys.get_info(file_sys.hash2id(variable))
  
  if info['type']=='folder':
    file_sys.del_folder(info['id'])
  else:
    file_sys.del_file(info['id'])
  path = info['path'].rsplit('/',maxsplit=1)[0].strip('/')
  parent = file_sys.get_info(file_sys.path2id(path))

  field = parent["path"].split("/")[0]
  hash = parent["hash"]
  return redirect(f'/{field}/{hash}')

def secure_folder(filename):
  filename = filename.split('/')[-1].split('\\')[-1]
  return filename

@app.route('/create_dir', methods=['POST'])
#@login_required
async def create_dir():
  form = request.form
  root = form['root'].strip('/')
  folder = form['name']

  if folder:
    folder = secure_folder(folder)
    file_sys.create_dir(
      folder,
      root=root,
      tag=form['tag'].split('/'),
      description=form['des'],
    )
    new_folder = file_sys.get_info(file_sys.path2id(root+'/'+folder))
    return {'href':new_folder['hash']}

  return 'Error'


#影片播放
def get_chunk(content, filesize, byte1=None, byte2=None):
  yielded = 0
  yield_size = byte2-byte1

  if byte1 is not None:
    if not byte2:
      byte2 = filesize
    yielded = byte1
    filesize = byte2

  while True:
    remaining = filesize - yielded
    if yielded == filesize:
      break
    if remaining >= yield_size:
      yield content[yielded:yielded+yield_size]
      yielded += yield_size
    else:
      yield content[yielded:yielded+remaining]
      yielded += remaining

@app.route('/get_media/<variable>', methods=['GET'])
def get_media(variable):
  filename = file_sys.get_file(file_sys.hash2id(variable))
  filesize = os.path.getsize(filename)
  type = file_sys.get_info(file_sys.hash2id(variable))['type']
  range_header = request.headers.get('Range', None)


  if range_header:
    byte1, byte2 = None, None
    match = re.search(r'(\d+)-(\d*)', range_header)
    groups = match.groups()
    
    if groups[0]:
      byte1 = int(groups[0])
    if groups[1]:
      byte2 = int(groups[1])+1

    if byte2 == byte1 == None:
      return send_file(filename)

    if not byte2:
      byte2 = byte1 + 8388608
      if byte2 > filesize:
        byte2 = filesize

    with open(filename, 'rb') as f:
      content = f.read()

    resp = Response(
      get_chunk(content, filesize, byte1, byte2),
      status=206, 
      direct_passthrough=True,
      mimetype=type
    )
    if request.headers.get('User-Agent','').find('Mac') != -1:
      resp.headers.add('Content-Range', f'bytes {byte1}-{byte2}/{filesize}')
    else:
      resp.headers.add('Content-Range', f'bytes {byte1}-{byte2-1}/{filesize}')
    resp.headers.add('Content-length', f'{byte2-byte1}')
    
    return resp

  return Response(
    get_chunk(),
    status=200
  )

@app.before_request
def make_session_permanent():
  session.permanent = True

@app.after_request
def after_request(response):
  response.headers.add('accept-ranges', 'bytes')
  return response