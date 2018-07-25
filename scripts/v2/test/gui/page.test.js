/*var assert = require('assert');

const puppeteer = require('puppeteer');

describe('Page Tests', function () {
    var page = require('../../src/gui/page.js').page;

    beforeEach(async () => {
        browser = await puppeteer.launch();
        headlessPage = await browser.newPage();
    });

    afterEach(function () {
        browser.close();
    });

    describe('Interacting with HTML Page', function () {
        it('Appending Element', async () => {

            await headlessPage.addScriptTag({ path: 'scripts/v2/src/gui/page.js' });

            await headlessPage.evaluate(() => {
                new page().create('svg').attribute('id','plot').place(document.body);
                assert.equal(true, document.getElementById('plot'));
                
            });
        });
    });
});*/