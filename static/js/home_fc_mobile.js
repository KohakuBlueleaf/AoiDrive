
//檔案大小單位
let UNIT = ['B','KB','MB','GB','TB'];
//各種種類檔案的icon
let ICONS = {
  image: "far fa-file-image fa-lg",
  video: 'far fa-file-video fa-lg',
  audio: 'far fa-file-audio fa-lg',
  doc: 'far fa-file-word fa-lg',
  excel: 'far fa-file-excel fa-lg',
  ppt: 'far fa-file-powerpoint fa-lg',
  zip: 'far fa-file-archive fa-lg',
  code: 'far fa-file-code fa-lg',
  None: 'far fa-file-alt fa-lg',
  pdf: 'far fa-file-pdf fa-lg'
}

//資料物件
let info_obj;
//所有檔案物件
let files_obj;
//操作欄物件
let op_obj;
//上傳檔案modal物件
let upload_modal_obj;
let player;6

//本頁屬性
//本頁的區域(public 或 personal)
let field = window.location.pathname.split('/')[1]
//本資料夾的hash(區域的根目錄應為空)
let now_hash = window.location.pathname.split(field+'/')[1]
//本頁面的path(用於上傳檔案/建立資料夾等)
let now_info = {
  path:''
};



//初始化界面資料
function initialize(){
  //建立files_obj
  //files_obj:儲存本幕路底下的所有檔案及資料夾物件
  //利用v-for渲染檔案物件的同時監聽點擊事件
  //dbclick為資料夾物件使用 雙擊進入該資料夾
  files_obj = new Vue({
    el: '#file_list',
    delimiters : ['{[' , ']}'],
    data :{
      files: [],
      dirs: [],
      icons: ICONS
    },
    methods :{
      //單擊物件
      //如果是圖片物件就設定thumbnail
      //如果是影片物件就建立video player
      //並且將選中的物件加上selected的class 改變顏色
      click: function(items){
        if(items.type=='folder'){
          window.location.href = '/'+field+'/'+items.hash
        }
        if(info_obj.hash == items.hash){
          return
        }
        info_obj = items

        type = items.type.split('/')[0]
        document.getElementById('vid-container').setAttribute('style', 'display:none !important')
        document.getElementById('info_aud').setAttribute('style', 'background-color:#000;display:none !important')
        //document.getElementById('info_img').style.display='none !important'
        
        //判斷不同檔案類型的處理方式
        if(type=='image'){
          $('#info_img').prop("src", "/thumbnail/"+items.id.toString())
          $('#info_img').prop("style", "")
        }else if(type=='video'){
          player.source = "/get_media/"+items.hash
          $('#vid-container').css({'display':''})
        }else if(type=='audio'){
          $('#info_aud').prop("src", "/audio/"+items.hash)
          $('#info_aud').css({
            'display':''
          })
          document.getElementById('audio').src = '/get_media/'+info_obj.hash
          document.getElementById('audio').load()
        }
        //設定被選擇的物件
        $('.selected').removeClass('selected');
        $('#file_'+items.id.toString()).addClass('selected');
      }
    }
  });

  //資訊物件
  //其中儲存了被選上的檔案/資料夾的物件
  info_obj = {id:-1, name:'', size:-1, tag:[], his:'', hash:''}

  //操作物件
  //主要用途為監聽操作欄的點擊事件及渲染當前目錄
  op_obj = new Vue({
    el: '#file_operate',
    delimiters: ['{[',']}'],
    data: {
      now_hash: now_info.hash,
      now_field: '',
      method:[],
      back_state:'display:none',
    },
    methods:{
      //下載
      load: function(){
        file = info_obj
        if(file.id>0){
          link = document.createElement('a')
          link.href = '/download/'+file.hash
          link.click()
        }
      },
      //刪除
      del: function(){
        file = info_obj
        if(file.id>0){
          link = document.createElement('a')
          link.href = '/delete/'+file.hash
          link.click()
        }
      }
    }
  });

  //上傳檔案的modal的物件
  //其中包括了是否正在上傳(以及對應的顯示狀態)
  //當上傳中時 輸入檔案資料及選擇檔案的區塊會被設定為display:none;
  upload_modal_obj = new Vue({
    el: '#uploadModal',
    delimiters: ['{[',']}'],
    data: {
      status: "",
      uploading: false,
      progress: 0,
      speed: "",
    }
  })

  //獲取本頁面的資料夾資料
  //先以網址的hash去獲得本頁資訊(儲存在now_info)
  //再以now_hash去get_info
  if(now_hash==''){
    url = '/field/'+field
  }else{
    url = '/path/'+now_hash
  }
  $.ajax({
    url: url,
    type: "post",
    data: {},
    dataType: 'json',

    success: function(response){
      now_info = response
      op_obj.now_field = now_info.path
      op_obj.now_hash = now_info.hash
      get_info('/'+field+'/'+now_hash)
    }
  });

  player = new AoiPlayer('vid_player')
  player.max_height = '33vh'
};

/*
資料獲取
*/
//用get_info設定的新網址去設定現在的頁面狀態
function set_info_now(){
  //因為呼叫set_info_now通常是get_info更改過網址的狀態
  //所以先重新獲取一次now_hash並判斷是否為區域根目錄
  now_hash = window.location.pathname.split(field+'/')[1]
  if(now_hash==''){
    url = '/field/'+field
  }else{
    url = '/path/'+now_hash
  }
  
  //判斷新path的區域 並更新op_obj的下拉選單內容
  if(field =='public'){
    op_obj.method = [{
      index: 0,
      name: '個人雲端硬碟',
      method: function(){
        get_info('/personal')
      }
    }]
  }else if(field == 'personal'){
    op_obj.method = [{
      index: 0,
      name: '共用雲端硬碟',
      method: function(){
        get_info('/public')
      }
    }]
  }

  //獲取本頁面的資料
  $.ajax({
    url: url,
    type: "post",
    data: {},
    dataType: 'json',

    success: function(response){
      now_info = response
      //如果本頁面為區塊根目錄 不顯示上一頁按鈕
      if(now_info.path=='public' || now_info.path == 'personal'){
        window.history.pushState(null,null,'/'+now_info.path+'/');
        $('#back-arrow').css({
          'display':'none'
        })
      }else{
        $('#back-arrow').css({
          'display':'default'
        })
      }
      //將op_obj用來顯示現在路徑的資訊更新
      op_obj.now_field = now_info.path
      op_obj.now_hash = now_info.hash
    }
  });
}
//獲取目標頁面(path)的資料
function get_info(path){
  field = path.split('/')[1]
  //獲取資料
  $.ajax({
		url: path,
		type: "post",
		data: {},
		dataType: 'json',

		success: function(response){
      files = response['files']
      dirs = response['dirs']

      files_obj.files= files;
      files_obj.dirs = dirs;
      window.history.pushState(null,null,path);
      //獲取完資料之後使用set_info_now去更新其他資料
      set_info_now()
    }
	});
};
//回到父目錄
function back_to_parent(){
  //獲取父目錄的目錄
  //使用split('/')分開各層之後
  //以不取最後一層的方式獲取父目錄
  path = now_info.path
  all = path.split('/')
  res = ''
  for(var i=1; i<all.length-1; i++){
    res += '/'+all[i]
  }
  
  //從目錄獲取hash
  $.ajax({
		url: '/path2hash',
		type: "post",
		data: {
      field: field,
      path:  res.substr(1)
    },
		dataType: 'json',

    //從獲取的hash去獲取父目錄資料
		success: function(response){
      if(response['is_field_root']){
        get_info('/'+field+'/')
      }else{
        get_info('/'+field+'/'+response['hash'])
      }
    }
	});
}

/* 
檔案操作
*/
let up_stat = {
  uploading: false, 
  scanning: false,
  last_scan: 0
}
//從拖曳的物件中獲取檔案/路徑
//基本是從stack overflow抄來的
//簡單的dfs
function traverseFileTree(item, path, all_file, all_file_name, path_stat, all_dir) {
  var d = new Date()
  up_stat.scanning = true

  path = path || "";
  if (item.isFile) {
    // Get file
    item.file(function(file) {
      var name = file.name
      all_file_name.push(name)
      all_file[name] = file
      path_stat[name] = path
    });
  } else if (item.isDirectory) {
    // Get folder contents
    if(path in all_dir){
      all_dir[path].push(item.name)
    }else{
      all_dir[path] = [item.name]
    }
    //console.log(item.name)
    var dirReader = item.createReader();

    var load = setInterval(function(){
      dirReader.readEntries(function(entries) {
        //console.log(entries.length)
        if(entries.length==0){
          clearInterval(load);
        }
        for (var i=0; i<entries.length; i++) {
          traverseFileTree(entries[i], path + item.name + "/", all_file, all_file_name, path_stat, all_dir);
        }
      })
    },50);
  }
  //設定一個timeout
  //用來檢查是否全部路徑都掃描完畢
  up_stat.last_scan = d.getTime()
  var now_time = d.getTime()
  setTimeout(
    function(){
      if(d.getTime()-up_stat.last_scan==0){
        up_stat.scanning = false
      }
    },200
  )
}
//放開拖曳物件
function drop(event){
  //取消預設事件
  event.preventDefault();
  //獲取各種資料
  var length = event.dataTransfer.items.length
  var items = event.dataTransfer.items

  //建立新表單
  var file_form = new FormData()
  file_form.append('root',now_info.path);
  file_form.append('des','')
  file_form.append('tag','')
  
  //掃描所有物件
  for(var i=0 ;i<length; i++){
    item = items[i]
    //如果物件是檔案 加進file_form
    if(item.webkitGetAsEntry().isFile){
      file = item.getAsFile()
      file_form.append(file.name, file)
    //如果物件是資料夾 掃描資料夾後上傳
    //因為多個資料夾會導致掃描跟上傳產生衝突
    //因此只要遇到資料夾就是上傳該資料夾後退出
    }else{
      folder = item.webkitGetAsEntry()
      //要丟進dfs的物件
      var all_file = {}
      var all_file_name = []
      var all_dir = {}
      var path_stat = {}
      //dfs
      traverseFileTree(folder,now_info.path+'/',all_file,all_file_name,path_stat,all_dir)
      
      //確認掃描完全之後上傳
      upload = setInterval(
        function(){
          if(up_stat.scanning != true){
            form = new FormData()
            form.append('root_list',JSON.stringify(path_stat))
            form.append('dirs', JSON.stringify(all_dir))
            
            for(var i in all_file_name){
              item = all_file_name[i]
              form.append(item, all_file[item])
            }
            upload_form(form)
            clearInterval(upload)
          }
        },200
      )
      return
    }
  }
  upload_form(file_form)
}
function dragover(event){
  event.preventDefault();
}

//上傳檔案(經由modal)
function upload(data){
  form = document.getElementById("upload_file");
  var temp = new FormData(form)
  var formData = new FormData();
  
  for(var pair of temp.entries()) {
    console.log(pair[0]+ ', '+ pair[1]);
    key = pair[0]; value = pair[1];
    if(key=='File'){
      formData.append(value.name,value)
    }else{
      formData.append(key,value)
    }
  }
  formData.append('root',now_info.path);
  upload_form(formData)
};

//上傳form資料
function upload_form(formData){
  //開啟進度條
  $('#uploadModal').modal('show')
  upload_modal_obj.status='display:none'
  //ajax上傳
  $.ajax({
    url:'/upload',
    type : "POST",
    data : formData,
    contentType: false,
    cache: false,
    processData: false,
    success : function(data) {
      if('success' in data){
        get_info('/'+field+'/'+now_hash)
        setTimeout(
          function(){
            $('#uploadModal').modal('hide')
            up_stat.uploading = false
            upload_modal_obj.status = ""
            upload_modal_obj.progress = 0
            document.getElementById('upload_file').reset()
          },
          500
        )
      }
    },
    error: function(data) {
      setTimeout(
        function(){
          $('#uploadModal').modal('hide')
          up_stat.uploading = false
          upload_modal_obj.status = ""
          upload_modal_obj.progress = 0
          document.getElementById('upload_file').reset()
        },
        500
      )
      alert('伺服器出現錯誤，請聯絡管理員');
    },
    //進度確認
    xhr: function(){
      var xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', function(e){
        if(e.lengthComputable){
          d = new Date()
          if(up_stat.uploading != true){
            up_stat.uploading = true
            upload_modal_obj.status = "display:none;"
          }
          upload_modal_obj.progress = e.loaded / e.total*100;
        }
      }, false);
      return xhr;
    }
  });
}
//建立資料夾
function create_dir(){
  form = document.getElementById("create_dir");
  var formData = new FormData(form);
  formData.append('root',now_info.path);

  $.ajax({
    url:'/create_dir',
    type : "POST",
    data : formData,
    contentType: false,
    cache: false,
    processData: false,
    success : function(data) {
      get_info('/'+field+'/'+now_hash)
      $('#createDirModal').modal('hide');
    },error: function(data) {
      alert('伺服器出現錯誤，請聯絡管理員');
      $('#createDirModal').modal('hide');
    }
  });
};

//filter
Vue.filter('format_size', function(size){
  size = Math.round(size)
  if (size<=0){
    return ''
  }
  var t = 0;
  while(size>1000){
    size /= 1000;
    t += 1;
  }
  return Math.round(size).toString()+UNIT[t];
});