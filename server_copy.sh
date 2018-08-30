#!/bin/bash

cd ~/manhattan
browserify --debug scripts/v4/src/main.js -o bundles/v4/v4_bundle.js

cd ~
cp manhattan/bundles/v4/v4_bundle.js Sites/manhattan_site/bundles/v4
cp manhattan/html/slippyplot_v4.html Sites/manhattan_site/html

cp manhattan/node_modules/fuse.js/dist/fuse.min.js Sites/manhattan_site/node_modules/fuse.js/dist

# copy plots
cp -r manhattan_data/plots/* Sites/manhattan_site/plots

sudo apachectl restart