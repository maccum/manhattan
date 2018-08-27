(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*dependency: fuse */
var search = (function () {

    var results = []; // result from search query
    var focus = 1; // n-th row of results table we're focused on

    /*
    $.getJSON('phenotypes.json', function(data) {
        $.each(data, function (key,val) {
          console.log('key: '+key+' val: '+val);  
        });
    })*/

    var phenotypes = [
        {
            id: 0,
            title: "standing height",
            url: '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height',
            desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed',
        },
        {
            id: 1,
            title: "caffeine consumption",
            url: '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption',
            desc: 'do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        },
    ];

    // fuse options
    var options = {
        shouldSort: true,
        includeScore: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
            "title",
            "author.firstName"
        ]
    };

    function makeTable() {
        $('<table id="search_table"><tr id="search_titles"></tr></table>').appendTo('#searchbar_target');
        $('#search_titles').append('<th width="20px">id</th>');
        $('#search_titles').append('<th width="100px">phenotype</th>');
        $('#search_titles').append('<th width="400px">description</th>');
    }

    function clearTableContents() {
        $('.row').remove();
    }

    function displayResults(contents, keysToDisplay) {
        clearTableContents();
        for (var i = 0; i < contents.length; i++) {
            var row = '<tr class="row">';
            var item = contents[i].item;
            //var keys = Object.keys(item);
            for (var j = 0; j < keysToDisplay.length; j++) {
                var cell = '<td>' + item[keysToDisplay[j]] + '</td>';
                row += cell;
            }
            row += '</tr>';
            $('#search_table').append(row);
        }
    }

    var fuse = new Fuse(phenotypes, options);
    makeTable();

    function searchBarKeyUp(e) {
        // if key was not the up or down arrow key, display results
        if (e.keyCode != 40 && e.keyCode != 38) {
            var contents = $('#searchbar').val();
            results = fuse.search(contents);
            displayResults(results, ['id', 'title', 'desc']);
            focus = 1;
        }
    }

    function searchBarKeyPress(e) {
        // if enter key was pressed
        if (e.keyCode == 13) {
            e.preventDefault();
            console.log('enter key');

            if (focus != 1) {
                var selected = $(".row:nth-of-type(" + focus + ")");
                console.log(selected);
                var id = selected.children().eq(0).html();
                var phenotype = selected.children().eq(1).html();
                console.log('phenotype: ' + phenotype);
                $('#searchbar').val(phenotype);
            } else {
                var query = $('#searchbar').val();
                res = fuse.search(query);
                if (res.length > 0) {
                    if (res[0].score == 0) {
                        console.log('perfect match');
                        return;
                    }
                }
                console.log("no match");
            }
        }
    }

    function searchBarKeyDown(e) {
        // change highlighted row in results table
        if (e.keyCode == 40) { // down arrow
            if (focus < results.length + 1) {
                focus += 1;
            }
        } else if (e.keyCode == 38) { // up arrow
            if (focus > 1) {
                focus -= 1;
            }
        }
        $(".row").children('td').css('border', '1px solid #dddddd');
        $(".row:nth-of-type(" + focus + ")").children('td').css('border', '1px solid #000000');
    }

    $('#searchbar').on('keyup', searchBarKeyUp);
    $('#searchbar').on('keypress', searchBarKeyPress);
    $('#searchbar').on('keydown', searchBarKeyDown);

}());

module.exports.search = search;
},{}],2:[function(require,module,exports){
var search = require('./handlers/search.js').search;

function init() {
    console.log('init');
}

init();
},{"./handlers/search.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjQvc3JjL2hhbmRsZXJzL3NlYXJjaC5qcyIsInNjcmlwdHMvdjQvc3JjL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qZGVwZW5kZW5jeTogZnVzZSAqL1xudmFyIHNlYXJjaCA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgcmVzdWx0cyA9IFtdOyAvLyByZXN1bHQgZnJvbSBzZWFyY2ggcXVlcnlcbiAgICB2YXIgZm9jdXMgPSAxOyAvLyBuLXRoIHJvdyBvZiByZXN1bHRzIHRhYmxlIHdlJ3JlIGZvY3VzZWQgb25cblxuICAgIC8qXG4gICAgJC5nZXRKU09OKCdwaGVub3R5cGVzLmpzb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbiAoa2V5LHZhbCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdrZXk6ICcra2V5KycgdmFsOiAnK3ZhbCk7ICBcbiAgICAgICAgfSk7XG4gICAgfSkqL1xuXG4gICAgdmFyIHBoZW5vdHlwZXMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAwLFxuICAgICAgICAgICAgdGl0bGU6IFwic3RhbmRpbmcgaGVpZ2h0XCIsXG4gICAgICAgICAgICB1cmw6ICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLFxuICAgICAgICAgICAgZGVzYzogJ0xvcmVtIGlwc3VtIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciBhZGlwaXNjaW5nIGVsaXQsIHNlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAxLFxuICAgICAgICAgICAgdGl0bGU6IFwiY2FmZmVpbmUgY29uc3VtcHRpb25cIixcbiAgICAgICAgICAgIHVybDogJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHMvY2FmZmVpbmVfY29uc3VtcHRpb24nLFxuICAgICAgICAgICAgZGVzYzogJ2RvIGVpdXNtb2QgdGVtcG9yIGluY2lkaWR1bnQgdXQgbGFib3JlIGV0IGRvbG9yZSBtYWduYSBhbGlxdWEuJyxcbiAgICAgICAgfSxcbiAgICBdO1xuXG4gICAgLy8gZnVzZSBvcHRpb25zXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIHNob3VsZFNvcnQ6IHRydWUsXG4gICAgICAgIGluY2x1ZGVTY29yZTogdHJ1ZSxcbiAgICAgICAgdGhyZXNob2xkOiAwLjYsXG4gICAgICAgIGxvY2F0aW9uOiAwLFxuICAgICAgICBkaXN0YW5jZTogMTAwLFxuICAgICAgICBtYXhQYXR0ZXJuTGVuZ3RoOiAzMixcbiAgICAgICAgbWluTWF0Y2hDaGFyTGVuZ3RoOiAxLFxuICAgICAgICBrZXlzOiBbXG4gICAgICAgICAgICBcInRpdGxlXCIsXG4gICAgICAgICAgICBcImF1dGhvci5maXJzdE5hbWVcIlxuICAgICAgICBdXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG1ha2VUYWJsZSgpIHtcbiAgICAgICAgJCgnPHRhYmxlIGlkPVwic2VhcmNoX3RhYmxlXCI+PHRyIGlkPVwic2VhcmNoX3RpdGxlc1wiPjwvdHI+PC90YWJsZT4nKS5hcHBlbmRUbygnI3NlYXJjaGJhcl90YXJnZXQnKTtcbiAgICAgICAgJCgnI3NlYXJjaF90aXRsZXMnKS5hcHBlbmQoJzx0aCB3aWR0aD1cIjIwcHhcIj5pZDwvdGg+Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCIxMDBweFwiPnBoZW5vdHlwZTwvdGg+Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCI0MDBweFwiPmRlc2NyaXB0aW9uPC90aD4nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhclRhYmxlQ29udGVudHMoKSB7XG4gICAgICAgICQoJy5yb3cnKS5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXNwbGF5UmVzdWx0cyhjb250ZW50cywga2V5c1RvRGlzcGxheSkge1xuICAgICAgICBjbGVhclRhYmxlQ29udGVudHMoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJvdyA9ICc8dHIgY2xhc3M9XCJyb3dcIj4nO1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSBjb250ZW50c1tpXS5pdGVtO1xuICAgICAgICAgICAgLy92YXIga2V5cyA9IE9iamVjdC5rZXlzKGl0ZW0pO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzVG9EaXNwbGF5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNlbGwgPSAnPHRkPicgKyBpdGVtW2tleXNUb0Rpc3BsYXlbal1dICsgJzwvdGQ+JztcbiAgICAgICAgICAgICAgICByb3cgKz0gY2VsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC90cj4nO1xuICAgICAgICAgICAgJCgnI3NlYXJjaF90YWJsZScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGZ1c2UgPSBuZXcgRnVzZShwaGVub3R5cGVzLCBvcHRpb25zKTtcbiAgICBtYWtlVGFibGUoKTtcblxuICAgIGZ1bmN0aW9uIHNlYXJjaEJhcktleVVwKGUpIHtcbiAgICAgICAgLy8gaWYga2V5IHdhcyBub3QgdGhlIHVwIG9yIGRvd24gYXJyb3cga2V5LCBkaXNwbGF5IHJlc3VsdHNcbiAgICAgICAgaWYgKGUua2V5Q29kZSAhPSA0MCAmJiBlLmtleUNvZGUgIT0gMzgpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50cyA9ICQoJyNzZWFyY2hiYXInKS52YWwoKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBmdXNlLnNlYXJjaChjb250ZW50cyk7XG4gICAgICAgICAgICBkaXNwbGF5UmVzdWx0cyhyZXN1bHRzLCBbJ2lkJywgJ3RpdGxlJywgJ2Rlc2MnXSk7XG4gICAgICAgICAgICBmb2N1cyA9IDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWFyY2hCYXJLZXlQcmVzcyhlKSB7XG4gICAgICAgIC8vIGlmIGVudGVyIGtleSB3YXMgcHJlc3NlZFxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZW50ZXIga2V5Jyk7XG5cbiAgICAgICAgICAgIGlmIChmb2N1cyAhPSAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkID0gJChcIi5yb3c6bnRoLW9mLXR5cGUoXCIgKyBmb2N1cyArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzZWxlY3RlZCk7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gc2VsZWN0ZWQuY2hpbGRyZW4oKS5lcSgwKS5odG1sKCk7XG4gICAgICAgICAgICAgICAgdmFyIHBoZW5vdHlwZSA9IHNlbGVjdGVkLmNoaWxkcmVuKCkuZXEoMSkuaHRtbCgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwaGVub3R5cGU6ICcgKyBwaGVub3R5cGUpO1xuICAgICAgICAgICAgICAgICQoJyNzZWFyY2hiYXInKS52YWwocGhlbm90eXBlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gJCgnI3NlYXJjaGJhcicpLnZhbCgpO1xuICAgICAgICAgICAgICAgIHJlcyA9IGZ1c2Uuc2VhcmNoKHF1ZXJ5KTtcbiAgICAgICAgICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc1swXS5zY29yZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGVyZmVjdCBtYXRjaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gbWF0Y2hcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWFyY2hCYXJLZXlEb3duKGUpIHtcbiAgICAgICAgLy8gY2hhbmdlIGhpZ2hsaWdodGVkIHJvdyBpbiByZXN1bHRzIHRhYmxlXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gNDApIHsgLy8gZG93biBhcnJvd1xuICAgICAgICAgICAgaWYgKGZvY3VzIDwgcmVzdWx0cy5sZW5ndGggKyAxKSB7XG4gICAgICAgICAgICAgICAgZm9jdXMgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChlLmtleUNvZGUgPT0gMzgpIHsgLy8gdXAgYXJyb3dcbiAgICAgICAgICAgIGlmIChmb2N1cyA+IDEpIHtcbiAgICAgICAgICAgICAgICBmb2N1cyAtPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICQoXCIucm93XCIpLmNoaWxkcmVuKCd0ZCcpLmNzcygnYm9yZGVyJywgJzFweCBzb2xpZCAjZGRkZGRkJyk7XG4gICAgICAgICQoXCIucm93Om50aC1vZi10eXBlKFwiICsgZm9jdXMgKyBcIilcIikuY2hpbGRyZW4oJ3RkJykuY3NzKCdib3JkZXInLCAnMXB4IHNvbGlkICMwMDAwMDAnKTtcbiAgICB9XG5cbiAgICAkKCcjc2VhcmNoYmFyJykub24oJ2tleXVwJywgc2VhcmNoQmFyS2V5VXApO1xuICAgICQoJyNzZWFyY2hiYXInKS5vbigna2V5cHJlc3MnLCBzZWFyY2hCYXJLZXlQcmVzcyk7XG4gICAgJCgnI3NlYXJjaGJhcicpLm9uKCdrZXlkb3duJywgc2VhcmNoQmFyS2V5RG93bik7XG5cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnNlYXJjaCA9IHNlYXJjaDsiLCJ2YXIgc2VhcmNoID0gcmVxdWlyZSgnLi9oYW5kbGVycy9zZWFyY2guanMnKS5zZWFyY2g7XG5cbmZ1bmN0aW9uIGluaXQoKSB7XG4gICAgY29uc29sZS5sb2coJ2luaXQnKTtcbn1cblxuaW5pdCgpOyJdfQ==
