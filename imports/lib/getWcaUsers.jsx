export default function(query, callback) {
  if(!query || !query.length) {
    return callback('query is not defined');
  }

  var path = '/api/v0/search/users';
  var url = wca.ROOT_URL + path;
  //var url = "http://localhost:3000" + path;
  console.log(url);
  $.ajax({
    url: url,
    data: {
      q: query,
    },
    type: 'GET',
    error: function(err) {
      callback(err);
    },
    success: function(res) {
      callback(null, res.result);
    }
  });

  //   $els.each(function() {
  //     var that = this;
  //     var delegate_only = $(that).hasClass("select-user-delegate");
  //     $(this).selectize({
  //       plugins: ['restore_on_backspace', 'remove_button', 'do_not_clear_on_blur'],
  //       options: wca.users,
  //       preload: true,
  //       valueField: 'id',
  //       labelField: 'name',
  //       searchField: ['name'],
  //       dropdownParent: 'body',
  //       delimeter: ',',
  //       render: {
  //         option: function(item, escape) {
  //           var html = '<span class="name">' + " " + escape(item.name) + "</span> ";
  //           if(item.wca_id) {
  //             html += '<span class="wca-id">' + escape(item.wca_id) + "</span>";
  //           }
  //           return '<div class="select-user">' + html + '</div>';
  //         }
  //       },
  //       score: function(search) {
  //         var score = this.getScoreFunction(search);
  //         return function(item) {
  //           return score(item);
  //         };
  //       },
  //       load: function(query, callback) {
  //         if(!query.length) {
  //           return callback();
  //         }
  //         var path = '/api/v0/search/users';
  //         var url = "https://www.worldcubeassociation.org" + path;
  //         //var url = "http://localhost:3000" + path;
  //         $.ajax({
  //           url: url,
  //           data: {
  //             q: query,
  //           },
  //           type: 'GET',
  //           error: function() {
  //             callback();
  //           },
  //           success: function(res) {
  //             callback(res.result);
  //           }
  //         });
  //       }
  //     });

  //   });
  // };
};
