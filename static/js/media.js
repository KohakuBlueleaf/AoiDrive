//物件初始化
//所有檔案物件
let files_obj;

//本頁屬性
//本資料夾的hash(區域的根目錄應為空)
let now_hash = window.location.pathname.split('media/')[1]
let player


//初始化界面資料
function initialize(){
  //建立files_obj
  //files_obj:儲存本幕路底下的所有檔案及資料夾物件
  //利用v-for渲染檔案物件的同時監聽點擊事件
  files_obj = new Vue({
    el: '#file_list',
    delimiters : ['{[' , ']}'],
    data :{
      files: []
    },
    methods :{
      //單擊物件
      //如果是圖片物件就設定thumbnail
      //如果是影片物件就建立video player
      //並且將選中的物件加上selected的class 改變顏色
      click: function(items){
        player.source = '/get_media/'+items.hash
      }
    }
  });

  //獲取本頁面的資料夾資料
  //先以網址的hash去獲得本頁資訊(儲存在now_info)
  //再以now_hash去get_info
  url = '/path/'+now_hash
  $.ajax({
    url: url,
    type: "post",
    data: {},
    dataType: 'json',

    success: function(response){
      now_info = response
      get_info('/'+now_info.path.split('/')[0]+'/'+now_hash)
    }
  });
  player = new AoiPlayer(
    id="player"
  )
  player.max_height = "75vh"
};

/*
資料獲取
*/
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
      files_obj.files= files;
      player.source = '/get_media/'+files[0].hash
    }
	});
};