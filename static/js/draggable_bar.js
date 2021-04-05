class DraggableBar{
  constructor(id,methods,properties){
    var bar = document.getElementById(id)
    bar.innerHTML = '\
      <div class="drag-container">\
        <div class="draggable" name="draggable">\
          <div name="draggable-handle" style="left:0%" class="draggable-handle">\
            <div class="draggable-handle-inner"></div>\
          </div>\
          <div name="progress-bar" class="progress-bar" style="width:0%"></div>\
          <div name="draggable-bar" class="draggable-bar" style="width:0%"></div>\
        </div>\
      </div>'
    var self = this

    this.bar = bar
    this.enable = true
    this.draggable = bar.querySelector('div[name="draggable"]')
    this.point = bar.querySelector('div[name="draggable-handle"]')
    this.draggable_bar = bar.querySelector('div[name="draggable-bar"]')
    this.progress_bar = bar.querySelector('div[name="progress-bar"]')
    this.point_click = false

    if(!('mousedown' in methods)){
      methods.mousedown = function(){}
    }
    if(!('mouseup' in methods)){
      methods.mouseup = function(){}
    }
    if(!('drag' in methods)){
      methods.drag = function(){}
    }
    if(!('dragdrop' in methods)){
      methods.dragdrop = function(){}
    }
    if(!('dragstart' in methods)){
      methods.dragstart = function(){}
    }
    this.draggable.addEventListener(
      'mousedown',
      function(event){
        if(self.enable==true){
          var p = (event.pageX-self.bar.getBoundingClientRect().x)/self.bar.offsetWidth
          if(self.set_pos(p)){
            methods.mousedown(self, event, p)
          }
        }
      }
    )
    this.draggable.addEventListener(
      'mouseup',
      function(event){
        if(self.enable==true){
          var p = (event.pageX-self.bar.getBoundingClientRect().x)/self.bar.offsetWidth
          if(self.set_pos(p)){
            methods.mouseup(self, event, p)
          }
        }
      }
    )
    this.point.addEventListener(
      'mousedown',function(event){
        if(self.enable==true){
          var start = event.pageX
          var pos = parseFloat(self.draggable_bar.style.width)/100
          methods.dragstart(self, event)
          document.onmousemove = function(event){
            var p = (event.pageX-start)/self.bar.offsetWidth
            if(self.set_pos_offset(p,pos)){
              methods.drag(self, event, p+pos)
            }
          }
          document.onmouseup = function(event){
            var p = (event.pageX-start)/self.bar.offsetWidth
            if(self.set_pos_offset(p,pos)){
              methods.dragdrop(self, event, p+pos)
            }
            document.onmousemove = document.onmouseup = null
          }
        }
      }
    )
  }
  set_pos(p){
    if(p<=1 && p>=0){
      this.draggable_bar.style.width = p*100+'%'
      this.point.style.left = p*100+'%'
      return true
    }else{
      return false
    }
  }
  set_pos_offset(p, pos){
    var p = p+pos
    if(p<=1 && p>=0){
      this.draggable_bar.style.width = p*100+pos+'%'
      this.point.style.left = p*100+pos+'%'
      return true
    }else{
      return false
    }
  }
  set_state(state){
    if(state==true){
      this.enable = true
    }else{
      this.enable = false
    }
  }
}