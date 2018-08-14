var widgetSingleton = require('../plot/init.js').widgetSingleton;

function init(args) {
    // 1. initialize widget (add svg elements to html)
    widgetSingleton.init(
        'widget',
        1300, 
        350, 
        1024, 
        256, 
        ['caffeine_consumption', 'standing_height'], 
        ['/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height'],
        [2, 2],
        [7, 8]);

    // 2. add tiles

    // 3. add listeners
    
}