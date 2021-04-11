from traceback import format_exc
import re

def error_handle(func):
  async def function(*args,**kwargs):
    try:
      return (await func(*args, **kwargs))
    except:
      err = format_exc()
      log_error(err)
  function.__name__ = func.__name__
  return function


def log_error(err, ignore_file_name=['flask','greenletio']):
  all_mes = re.findall(r'File.*\n\s+.*',err)
  err_class, err_message = re.findall(r'.+: .+',err)[0].split(": ",1)

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