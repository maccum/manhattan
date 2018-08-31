### setting up 
1. clone repository
2. install npm and nodejs
3. install fuse.js (can skip --already included in repo)

#### Run javascript tests

Install mocha with npm, then run:

>>> mocha scripts/test --recursive

There is also the `nyan` cat option:

>>> mocha scripts/test --recursive -R nyan

#### Package javascript files into a single bundle

Only one js file is linked in the html page. Each time source files are edited, code
should be re-packaged using browserify into a single js file.

Install browserify with npm.

The --debug flag ensures that stacktraces include line numbers of the original files.

>>> browserify --debug scripts/src/main.js -o scripts/bundles/slippyplot.js

#### Images

See jupyter/example_tile_generation.ipynb for example script to generate tiles.
Script uses a hail branch maccum/tile_generator_script.

`plot` folder expects images in the following structure:

```
plot/
    phenotype_name_1/
        metadata.json          --- metadata about plot such as axis bounds that were used, min and max zoom levels, id, title
        2/                     --- folder for zoom level 2
            hover.json         --- list of columns at this zoom level that have hover data, e.g. [0, 3]

            0.json             --- hover data for tile 0.json
            3.json

            0.png              --- matplotlib image for column 0 at zoom level 2
            1.png
            2.png
            3.png
        3/
        4/
    phenotype_name_2/
    phenotype_name_3/
```

#### Running

Hover data (textbox with metadata that shows up when you hover over
a point) will only work on a server (remote or localhost), not when 
viewing the html file locally, because the json files are read via
http connection. (easiest way to test is to set up Apache local 
web server on mac, then copy the entire directory to ~/Sites.) 