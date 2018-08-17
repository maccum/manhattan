var plotNames = [
    { title: 'caffeine_consumption', description: 'caffeine consumption' },
    { title: 'standing_height', description: 'height' }
];

// semantic ui interface
$('.ui.search').search({
    source: plotNames,
});

// enter key inside searchbox
$('.ui.search').on('keypress', function (e) {
    if (e.keyCode == 13) {
        e.preventDefault();
        console.log("keypress");
        searchPlots();
    }
});

// search icon click 
$('.fa.fa-search.w3-large').click(function (e) {
    e.preventDefault();
    searchPlots();
});

function searchPlots() {
    var searchText = $('#searchbar').val();
    var plotName = false;
    for (var i = 0; i < plotNames.length; i++) {
        if (plotNames[i].title == searchText) {
            plotName = searchText;
        }
    }
    if (plotName) {
        // change plot!
    }
}




