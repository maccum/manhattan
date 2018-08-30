## JavaScript source code for dynamic slippy plot

### files
src/     --------- source code
<br>
test/    --------- test code
<br>
bundles/ --------- single .js file with all packaged code from src


### setting up 
1. clone repository
2. make node_modules folder
3. install npm if not installed
4. install nodejs via npm if not already installed
5. install fuse.js into node_modules directory

### Install browserify for packaging javascript files
After edits are made to files in src, package them into a single js file.
1. install browserify via npm 
2. package javascript files into a single file for inclusion in html page, like so:
>>> browserify --debug scripts/v4/src/main.js -o bundles/v4/v4_bundle.js

### Install mocha for running javascript tests
1. install mocha via npm
2. run javascript tests with mocha:
>>> mocha scripts/v4/test --recursive

### Generating plots
javascript code requires a folder that already contains all of the images for each plot

use hail script to generate images

image folders will have format:

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
