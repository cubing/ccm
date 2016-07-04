$(function() {
  window.enableWcaUserSelect = function($els) {//JFLY
    $els.each(function() {//JFLY
      var that = this;
      var delegate_only = $(that).hasClass("select-user-delegate");
      $(this).selectize({
        plugins: ['restore_on_backspace', 'remove_button', 'do_not_clear_on_blur'],
        options: wca.users,
        preload: true,
        valueField: 'id',
        labelField: 'name',
        searchField: ['name'],
        dropdownParent: 'body',//JFLY
        delimeter: ',',
        render: {
          option: function(item, escape) {
            var html = '<span class="name">' + " " + escape(item.name) + "</span> ";
            if(item.wca_id) {
              html += '<span class="wca-id">' + escape(item.wca_id) + "</span>";
            }
            return '<div class="select-user">' + html + '</div>';
          }
        },
        score: function(search) {
          var score = this.getScoreFunction(search);
          return function(item) {
            return score(item);
          };
        },
        load: function(query, callback) {
          if(!query.length) {
            return callback();
          }
          var path = '/api/v0/search/users';
          var url = "https://www.worldcubeassociation.org" + path;//JFLY
          var url = "http://localhost:3000" + path;//JFLY
          $.ajax({
            url: url,
            data: {
              q: query,
            },
            type: 'GET',
            error: function() {
              callback();
            },
            success: function(res) {
              callback(res.result);
            }
          });
        }
      });

    });
  };//JFLY
});
