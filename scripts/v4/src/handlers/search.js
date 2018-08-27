/* 
Search bar for displaying results of query.

dependency: fuse 
*/
var search = (function () {

    var results = []; // result from search query
    var focus = 1; // n-th row of results table we're focused on

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
            if (focus != 1) {
                var selected = $(".row:nth-of-type(" + focus + ")");
                var phenotype = selected.children().eq(1).html();
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