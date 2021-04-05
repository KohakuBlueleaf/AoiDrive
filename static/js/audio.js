let is_playing = false;
let control_panel;
let audio;
let last_move = 0;
let is_over_control_panel = false;
let bar;
let vol;


//切換暫停撥放
function change_state(){
  var audio = document.getElementById("audio");
  if(is_playing == true){
    audio.pause()
    control_panel.button_state = "fas fa-play"
    is_playing = false;
  }else{
    audio.play()
    control_panel.button_state = "fas fa-pause"
    is_playing = true;
  }
}

//調整音量
function set_volume(p){
  vol.set_pos(p)
  value = p*100
  audio.volume = p
  if(value>=50){
    control_panel.volume_state = "fas fa-volume-up"
  }else if(value>20){
    control_panel.volume_state = "fas fa-volume-down"
  }else{
    control_panel.volume_state = "fas fa-volume-off"
  }
}
//調整靜音
function change_mute(){
  if(audio.muted){
    audio.muted = false
    vol.set_state(true)
    set_volume(parseFloat(vol.point.style.left)/100)
  }else{
    audio.muted = true
    vol.set_state(false)
    control_panel.volume_state = "fas fa-volume-mute"
  }
}

//撥放時改變時間軸長度及顯示的時間
function on_playing(event){
  var audio = document.getElementById("audio")
  var total = audio.duration
  var now = audio.currentTime
  bar.set_pos(now/total)
  control_panel.time = now

  var bf = audio.buffered;
  var time = audio.currentTime;
  var range = 0;

  while(!(bf.start(range) <= time&&time <= bf.end(range))) {
    range += 1;
  }
  var end = bf.end(range)/audio.duration
  bar.progress_bar.style.width = end*100+'%'
}
//改變影片撥放的時間點(相當於一般狀況的更改currentTime)
function change_time(p){
  audio = document.getElementById("audio")
  total = audio.duration
  audio.currentTime = total*p
  control_panel.time = total*p
}
function load_progress(event){
  audio = event.target

  var bf = audio.buffered;
  var time = audio.currentTime;
  var range = 0;

  while(!(bf.start(range) <= time&&time <= bf.end(range))) {
    range += 1;
  }
  var end = bf.end(range)/audio.duration
  bar.progress_bar.style.width = end*100+'%'
}

//物件初始化
function initialize_audio(){
  //初始化控制條的vue物件
  //time:現在時間
  //total:總共時間(duration)
  //volume:音量
  //button_state:暫停/播放鍵狀態
  //screen_state:全螢幕切換鍵狀態
  //volume_state:音量圖標狀態
  control_panel = new Vue({
    el: '#audio-control-panel',
    delimiters : ['{[' , ']}'],
    data :{
      time: 0,
      total: 0,
      volume: 100,
      button_state: "fas fa-play",
      screen_state: "fas fa-expand",
      volume_state: "fas fa-volume-up",
    }
  });

  //對全域變數賦值
  audio = document.getElementById("audio")
  //時間軸物件(draggable_bar.js)
  bar = new DraggableBar(
    id = 'bar',
    methods = {
      //滑鼠按在滑條上
      //暫停後將時間跳到該處
      mousedown: function (self, event, p){
        audio.pause()
        change_time(p)
        control_panel.button_state = "fas fa-play"
        is_playing = false;
      },
      //滑鼠在滑條上放開
      //開始撥放(接續上方mousedown)
      mouseup: function (self, event, p){
        audio.play()
        control_panel.button_state = "fas fa-pause"
        is_playing = true;
      },
      //開始拖移
      //設定拖移開始時的播放狀態 
      dragstart: function(self, event, p){
        self.state = document.getElementById("audio").paused
      },
      //拖移結束
      //依照拖移結果設定時間後 恢復到拖移開始時的播放狀態
      dragdrop: function(self, event, p){
        change_time(p)
        if(!self.state){
          audio.play()
          control_panel.button_state = "fas fa-pause"
        }
      }
    }
  )
  vol = new DraggableBar(
    id='vol-bar',
    method={
      mousedown: function(self, event, p){
        set_volume(p)
      },
      drag: function(self, event, p){
        set_volume(p)
      },
      dragdrop: function(self, event, p){
        set_volume(p)
      }
    }
  )
  vol.set_pos(1)

  //設定鍵盤監聽
  //j k l 往前十秒 暫停 往後十秒
  //o p m 音量下 音量上 靜音
  //f 全螢幕
  $(document).keypress(function(event){
    var code = event.code
    console.log(code)
    switch(code){
      case("KeyL"):{
        audio.currentTime += 10
        break
      }
      case("Space"):
      case("KeyK"):{
        change_state()
        break
      }
      case("KeyJ"):{
        audio.currentTime += -10
        break
      }
      case("KeyM"):{
        change_mute()
        break
      }
      case("KeyO"):{
        if(! audio.muted){
          var volu = parseInt(vol.point.style.left)
          volu = (volu-(volu%5))-5
          if(volu>100){
            volu = 100
          }
          set_volume(volu/100)
        }
        break
      }
      case("KeyP"):{
        if(!audio.muted){
          var volu = parseFloat(vol.point.style.left)
          volu = (volu-(volu%5))+5
          if(volu<0){
            volu = 0
          }
          set_volume(volu/100)
        }
        break
      }
    }
  })

  //獲取資料後填入總時間
  audio.addEventListener('canplay', (event) => {
    alert(audio.duration)
    control_panel.total = audio.duration
  });
}

//將時間(s)轉為(mm:ss)的狀況
Vue.filter('format_time', function(t){
  sec = t%60
  min = Math.round((t-sec)/60).toString()
  sec = Math.round(sec).toString()
  if(sec.length=='1'){
    sec = '0'+sec
  }
  
  return min + ':' + sec
});