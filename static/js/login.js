
function login(){
  account = document.getElementById('account').value
  passwd = document.getElementById('passwd').value

  $.ajax({
    url: '/login',
    type: "post",
    data: {
      'user_id':account,
      'password':passwd
    },
    dataType: 'json',

    success: function(response){
      console.log(response)
      switch(response['message']){
        case('success'):{
          link = document.createElement('a')
          link.href = '/'
          link.click()
        }
        case('wrong passwd'):
        case('no account'):
      }
    },
    error: function(e) {
      console.log(e)
      alert("error");
    }
  });
}