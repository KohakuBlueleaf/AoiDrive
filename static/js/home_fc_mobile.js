
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
let player;

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
        //document.getElementById('info_img').style.display='none !important'
        
        //設定被選擇的物件
        $('.selected').removeClass('selected');
        $('#file_'+items.id.toString()).addClass('selected');
      },
      play: function(items){
        if(items.type.split('/')[0]=='video'){
          console.log(items)
          $('#preview_video_modal').modal('show')
          $('#video-preview-file-name').text(items.name)
          player.source = '/get_media/'+items.hash
        }
      },
      set: function(item){
        info_obj = item
        $('.selected').removeClass('selected');
        $('#file_'+item.id.toString()).addClass('selected');
        $('#setPropertyModal').modal('show')
      },
      del: function(item){
        info_obj = item
        $('.selected').removeClass('selected');
        $('#file_'+item.id.toString()).addClass('selected');
        op_obj.del()
      },
      load: function(item){
        info_obj = item
        $('.selected').removeClass('selected');
        $('#file_'+item.id.toString()).addClass('selected');
        op_obj.load()
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
      video_file_state:'display:none',
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

  player = new AoiMobilePlayer('vid_player',false)
  player.max_height = '50vh'
  
  $('#preview_video_modal').on(
    'hidden.bs.modal', function(event){
      player.video.pause()
    }
  )
};

/*
檔案預覽
*/
function download_video_preview(){
  link = document.createElement('a')
  link.href = '/download/'+player.source.split('/get_media/')[1]
  link.click()
}

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

      var has_video = false;
      for(var i in files){
        if(files[i].type.split('/')[0]=='video'){
          has_video = true
          break;
        }
      }
      if(has_video){
        op_obj.video_file_state = '';
      }else{
        op_obj.video_file_state = 'display:none';
      }

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
  //upload_form(formData)
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

//建立資料夾
function set_property(){
  form = document.getElementById("set_property");
  var formData = new FormData(form);
  formData.append('hash',info_obj.file.hash);

  for(var pair of formData.entries()) {
    key = pair[0]; value = pair[1];
    console.log(key,value)
  }
  $.ajax({
    url:'/set_property',
    type : "POST",
    data : formData,
    contentType: false,
    cache: false,
    processData: false,
    success : function(data) {
      get_info('/'+field+'/'+now_hash)
      $('#setPropertyModal').modal('hide');
    },error: function(data) {
      alert('伺服器出現錯誤，請聯絡管理員');
      $('#setPropertyModal').modal('hide');
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