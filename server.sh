#!/bin/bash

# script for copying files from hail-manhattan to Sites folder for viewing on localhost

# start apache server if not already started
# sudo apachectl start

# bundle up all javascript files
cd ~/hail-manhattan
browserify --debug scripts/src/main.js -o scripts/bundles/slippyplot.js

cd ~
cp -r hail-manhattan/* Sites/hail-manhattan/

# restart apache server (must be done each time javascript/html files are updated)
sudo apachectl restart