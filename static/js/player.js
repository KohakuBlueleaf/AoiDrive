//時間轉字串
function format_time(t){
  sec = t%60
  min = Math.round((t-sec)/60).toString()
  sec = Math.round(sec).toString()
  if(sec.length=='1'){
    sec = '0'+sec
  }
  
  return min + ':' + sec
}

class AoiPlayer{
  constructor(id){
    /*
    初始化
    */
    //要填入撥放器的物件
    var player = document.getElementById(id)
    //設定class
    player.classList.add("player")
    //設定撥放器的html
    player.innerHTML = '<div class="video-container-outer"><div class="video-container-inter"><video name="video" class="video" preload="auto"></video></div></div><div id="_control" name="control-panel" class="control-panel"><div id="_bar"></div><div name="control" class="control-button-group"><div class="control-left"><button name="pause" class="pause-button"><i class="text-light fas fa-play"></i></button><span name="time" class="time"></span><div class="volume"><button name="volume" class="mute"><i class="text-light fas fa-volume-up" style="min-width:18px;max-width:18px"></i></button><div class="volume-bar"><div id="vol-bar"></div></div></div></div><div><button name="screen" style="background-color: transparent; border:0px;"><i class="text-light fas fa-expand"></i></button></div></div></div>'
    
    /*
    狀態參數
    */
    //設定各種參數
    var self = this
    //狀態參數
    this.is_playing = false;
    this.last_move = 0;
    this.is_over_control_panel = false;

    /*
    子物件
    */
    //物件
    this.root = player
    //控制面板(包括時間軸跟控制按鈕)
    this.control_panel = player.querySelector("div[id='_control']")
    //影片本體
    this.video = player.querySelector("video[name='video']")
    //時間顯示物件
    this.time = player.querySelector("span[name='time']")
    //暫停/撥放按鈕及其圖標
    this.pause = player.querySelector("button[name='pause']")
    this.pause_icon =  this.pause.querySelector('i')
    //音量圖標
    this.volume = player.querySelector("button[name='volume']")
    this.volume_icon =  this.volume.querySelector('i')
    //全螢幕按鍵及其圖標
    this.screen = player.querySelector("button[name='screen']")
    this.screen_icon =  this.screen.querySelector('i')
    
    /*
    參數監聽
    */
    //現在撥放時間/影片時長/物件高度
    var _current = 0
    var _duration = 0
    var _max_height = ''
    Object.defineProperty(this.time, 'now', {
      enumerable: true,
      configurable: true,
      set: (time)=>{
        _current = time
        this.time.innerText = format_time(time)+'/'+format_time(this.time.total)
      },
      get:()=>{return _current}
    })
    Object.defineProperty(this.time, 'total', {
      enumerable: true,
      configurable: true,
      set: (time)=>{
        _duration = time
        this.time.innerHTML = format_time(this.time.now||0)+'/'+format_time(time)
      },
      get:()=>{return _duration}
    })
    Object.defineProperty(this.pause, 'state', {
      enumerable: true,
      configurable: true,
      set: (mode) => {
        this.pause_icon.setAttribute('class','text-light '+mode)
      }
    })
    Object.defineProperty(this.volume, 'state', {
      enumerable: true,
      configurable: true,
      set: (mode) => {
        this.volume_icon.setAttribute('class','text-light '+mode)
      }
    })
    Object.defineProperty(this.screen, 'state', {
      enumerable: true,
      configurable: true,
      set: (mode) => {
        this.screen_icon.setAttribute('class','text-light '+mode)
      }
    })
    Object.defineProperty(this, 'source', {
      enumerable: true,
      configurable: true,
      set: (src) => {
        console.log(src)
        this.is_playing=false
        this.video.src = src
        this.video.load()
        this.change_time(0)
        this.bar.set_pos(0)
        this.pause.state = 'fas fa-play'
      },
      get: ()=>{
        return this.video.src
      }
    })
    Object.defineProperty(this, 'max_height', {
      enumerable: true,
      configurable: true,
      set: (height) => {
        _max_height = height
        if(!(document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen)){
          self.video.style['max-height'] = height
          console.log(height)
        }
      },
      get: ()=>{
        return _max_height
      }
    })

    /*
    滑條物件
    */
    //時間軸
    this.bar = new DraggableBar(
      '_bar',{
        //滑鼠按在滑條上
        //暫停後將時間跳到該處
        mousedown: function (this_bar, event, p){
          self.video.pause()
          self.change_time(p)
          self.pause.state = "fas fa-play"
          self.is_playing = false;
        },
        //滑鼠在滑條上放開
        //開始撥放(接續上方mousedown)
        mouseup: function (this_bar, event, p){
          self.video.play()
          self.pause.state = "fas fa-pause"
          self.is_playing = true;
        },
        //開始拖移
        //設定拖移開始時的播放狀態 
        dragstart: function(this_bar, event){
          this_bar.state = self.video.paused
        },
        //拖移結束
        //依照拖移結果設定時間後 恢復到拖移開始時的播放狀態
        dragdrop: function(this_bar, event, p){
          self.change_time(p)
          if(!this_bar.state){
            self.video.play()
            self.pause.state = "fas fa-pause"
          }
        }
      }
    )
    //音量滑條
    this.vol = new DraggableBar(
      'vol-bar',{
        mousedown:function(this_bar, event, p){
          self.set_volume(p)
        },
        drag: function(this_bar, event, p){
          self.set_volume(p)
        },
        dragdrop: function(this_bar, event, p){
          self.set_volume(p)
        }
      }
    )
    this.vol.set_pos(1)
    
    /*
    監聽事件 
    */
    //root
    //滑鼠移開撥放器, 將控制面板隱藏
    this.root.addEventListener(
      'mouseleave', function (event){
        if(!self.video.paused){
          self.control_panel.style.opacity = '0'
        }
      }
    )
    //滑鼠在撥放器上移動, 顯示控制面板
    this.root.addEventListener(
      'mousemove',function (event){
        self.root.style.cursor = 'default'
        self.control_panel.style.opacity = '1'
        //停止移動兩秒後 將時間軸及滑鼠隱藏
        var d = new Date()
        self.last_move = d.getTime()
    
        window.setTimeout(()=>{
          if((d.getTime()-self.last_move)==0 && !self.video.paused && !self.is_over_control_panel){
            self.control_panel.style.opacity = '0'
            self.root.style.cursor = "none";
          }
        },2000)
      }
    )
    this.root.addEventListener(
      'fullscreenchange',function (event){
        if(document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen){
          self.screen.state = "fas fa-compress"
          self.video.style['max-height'] = '100vh'
        }else{
          self.screen.state= "fas fa-expand"
          self.video.style['max-height'] = self.max_height
        }
      }
    )
    
    //video
    //資源載入完成, 設定總時長
    this.video.addEventListener(
      'canplay', function() {
      self.root.style.display = 'flex'
      self.time.total = self.video.duration
    });
    //撥放或改變currenttime時, 改變時間軸位置及更新現在時間
    this.video.addEventListener(
      'timeupdate', function on_playing(event){
        var video = self.video
        var total = video.duration
        var now = video.currentTime
        self.bar.set_pos(now/total)
        self.time.now = now
      
        var bf = video.buffered;
        var time = video.currentTime;
        var range = 0;
      
        while(!(bf.start(range) <= time&&time <= bf.end(range))) {
          range += 1;
        }
        var end = bf.end(range)/video.duration
        self.bar.progress_bar.style.width = end*100+'%'
      }
    )
    //影片物件被按下後切換暫停/撥放
    this.video.addEventListener(
      'click', function(){
        self.change_playing_state()
      }
    )
    
    //控制面板
    //當滑鼠在時間軸及控制欄上時 不隱藏滑鼠
    this.control_panel.addEventListener(
      'mouseover', function (event){
        self.is_over_control_panel = true
      }
    )
    //當滑鼠離開控制欄時, 設回預設狀態
    this.control_panel.addEventListener(
      'mouseout', function (event){
        self.is_over_control_panel = false
      }
    )
    
    //按鈕
    //按下暫停之後切換撥放狀態
    this.pause.addEventListener(
      'click', function(){
        self.change_playing_state()
      }
    )
    //按下音量圖標後切換靜音狀態
    this.volume.addEventListener(
      'click', function(){
        self.toggle_mute()
      }
    )
    //按下全螢幕按鈕後切換全螢幕狀態
    this.screen.addEventListener(
      'click', function(){
        self.change_screen_mode()
      }
    )
    
    //鍵盤操作
    //j k l:前十秒 暫停/撥放 後十秒
    //m o p:靜音 降低音量 升高音量
    //f:全螢幕
    document.addEventListener(
      'keypress', function(event){
        var code = event.code
        switch(code){
          case("KeyL"):{
            self.video.currentTime += 10
            break
          }
          case("Space"):
          case("KeyK"):{
            self.change_playing_state()
            break
          }
          case("KeyJ"):{
            self.video.currentTime += -10
            break
          }
          case("KeyM"):{
            self.toggle_mute()
            break
          }
          case("KeyF"):{
            self.change_screen_mode()
            break
          }
          case("KeyO"):{
            if(! self.video.muted){
              var volu = parseInt(vol.point.style.left)
              volu = (volu-(volu%5))-5
              if(volu>100){
                volu = 100
              }
              self.set_volume(volu/100)
            }
            break
          }
          case("KeyP"):{
            if(!self.video.muted){
              var volu = parseFloat(vol.point.style.left)
              volu = (volu-(volu%5))+5
              if(volu<0){
                volu = 0
              }
              self.set_volume(volu/100)
            }
            break
          }
        }
      }
    )
  }

  //切換撥放狀態
  change_playing_state(){
    self = this
    //撥放=>暫停
    if(self.is_playing == true){
      self.video.pause()
      self.pause.state = "fas fa-play"
      self.is_playing = false;
      self.control_panel.style.opacity = '1'
      self.root.style.cursor = "";
    //暫停=>撥放
    }else{
      self.video.play()
      self.pause.state = "fas fa-pause"
      self.is_playing = true;

      var d = new Date()
      self.last_move = d.getTime()
  
      window.setTimeout(()=>{
        if((d.getTime()-self.last_move)==0 && !self.video.paused && !self.is_over_control_panel){
          self.control_panel.style.opacity = '0'
          self.root.style.cursor = "none";
        }
      },2000)
    }
  }
  //設定音量
  set_volume(p){
    var value = p*100

    this.vol.set_pos(p)
    this.video.volume = p

    if(value>=50){
      this.volume.state = "fas fa-volume-up"
    }else if(value>20){
      this.volume.state = "fas fa-volume-down"
    }else{
      this.volume.state = "fas fa-volume-off"
    }
  }
  //切換靜音狀態
  toggle_mute(){
    if(this.video.muted){
      this.video.muted = false
      this.vol.set_state(true)
      this.set_volume(parseFloat(this.vol.point.style.left)/100)
    }else{
      this.video.muted = true
      this.vol.set_state(false)
      this.volume.state = "fas fa-volume-mute"
    }
  }
  //設定時間
  change_time(p){
    this.text = ":"
    var total = this.video.duration||0
    this.video.currentTime = total*p
    this.time.now = total*p
  }
  //切換全螢幕
  change_screen_mode(){
    var elem = this.root
    
    if(document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen){
      document.exitFullscreen()
    }else{
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    }
  }
}