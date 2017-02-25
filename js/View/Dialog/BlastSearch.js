define([
    'dojo/_base/declare',
    'dojo/dom-construct',
    'dojo/request',
    'dijit/focus',
    'dijit/form/Textarea',
    'JBrowse/View/Dialog/WithActionBar',
    'dojo/on',
    'dijit/form/Button'
],
function (
    declare,
    dom,
    request,
    focus,
    TextArea,
    ActionBarDialog,
    on,
    Button
) {
    return declare(ActionBarDialog, {

        title: 'Search NCBI BLAST',

        constructor: function (args) {
            this.height = args.height || 100;
            this.browser = args.browser;
            this.setCallback    = args.setCallback || function () {};
            this.cancelCallback = args.cancelCallback || function () {};
            this.heightConstraints = { min: 10, max: 750 };
        },

        _fillActionBar: function (actionBar) {
            var res = '';
            var thisB = this;
            new Button({
                label: 'Search',
                onClick: dojo.hitch(this, function () {
                    thisB.searchNCBI(this.textarea.value);
                })
            }).placeAt(actionBar);

            new Button({
                label: 'Cancel',
                onClick: dojo.hitch(this, function () {
                    this.cancelCallback && this.cancelCallback();
                    this.hide();
                })
            }).placeAt(actionBar);
        },

        show: function (callback) {
            dojo.addClass(this.domNode, 'blastDialog');

            this.textarea = dom.create('textarea', { id: 'query_blast', style: { width: '500px', height: '200px' } }),

            this.set('content', [
                dom.create('label', { 'for': 'query_blast', innerHTML: '' }),
                this.textarea,
                dom.create('p', { id: 'status_blast' }),
                dom.create('p', { id: 'results_blast' })
            ]);

            this.inherited(arguments);
        },

        hide: function () {
            this.inherited(arguments);
            window.setTimeout(dojo.hitch(this, 'destroyRecursive'), 500);
        },

        searchNCBI: function (query) {
            console.log(query);
            request('https://cors-anywhere.herokuapp.com/https://blast.ncbi.nlm.nih.gov/Blast.cgi?Query='+query+'&DATABASE=nt&PROGRAM=blastn&CMD=Put').then(function (res) {
                var m = res.match(/QBlastInfoBegin([\s\S)]*?)QBlastInfoEnd/);
                console.log(m[0]);
                var rid = m[1].match(/RID = (.*)/)[1];
                if(!rid) {
                    alert('No RID returned, abort');
                    return;
                }
                var count = 0;
                console.log(rid);

                var timer = setInterval(function () {
                    request('https://cors-anywhere.herokuapp.com/https://blast.ncbi.nlm.nih.gov/Blast.cgi?CMD=Get&FORMAT_OBJECT=SearchInfo&RID=' + rid).then(function (data) {
                        count++;
                        if (count > 100) {
                            clearInterval(timer);
                        }
                        var d = data.match(/QBlastInfoBegin([\s\S)]*?)QBlastInfoEnd/);
                        var stat = d[1].match(/Status=(.*)/)[1];
                        if (stat == 'UNKNOWN' || stat == 'WAITING') {
                            dojo.byId('status_blast').innerHTML = "Waiting ...";
                            console.log('waiting', stat);
                        }
                        else if (stat == 'READY') {
                            console.log('READY!', rid);
                            dojo.byId('status_blast').innerHTML = "Ready";
                            clearInterval(timer);
                            request('https://cors-anywhere.herokuapp.com/https://blast.ncbi.nlm.nih.gov/Blast.cgi?FORMAT_TYPE=text&CMD=Get&RID=' + rid).then(function (blast) {
                                dojo.byId('results_blast').innerHTML=blast;
                                console.log(blast);
                            }, function (error) {
                                console.error('Failed to get BLAST results');
                                console.error(error);
                            });
                        }
                    }, function (error) {
                        console.error('Error checking status');
                        console.error(error);
                    });
                }, 5000);
            }, function (error) {
                console.error('Error doing BLAST');
                console.error(error);
            });
        }
    });
});