  /********************************************************/
  /**     HERE MAIN MODIFIED PART FOR turnjs SUPPORT     **/
  /********************************************************/
  /// requires jquery and turnjs
  /// all code added in viewer.js (from pdfjs build) in order to support 
  /// flipbook is commented with '$FB:' string to allow to find it easilly 

  // "use strict";

  // pdfjsLib.GlobalWorkerOptions.workerSrc =
  //   "../build/pdf.worker.js";


  // document.addEventListener("webviewerloaded", function() {
  //   PDFViewerApplication.initializedPromise.then(function() {
  //     console.log("It's webviewerloaded")
  //   })
  // });

  //---- Coded by Shen Yang ----------------------------------//
  function loadingInfo(doc) {
    var loadingTask = pdfjsLib.getDocument(doc);
    loadingTask.promise.then(pdf => {
      var info = document.getElementById("loadingInfo")
      if (info !== null) {
        info.style.display = 'none';
      }
      // if (PDFViewerApplication.pdfViewer.scrollMode === 3) {
      //   console.log("It's on scrollmodechanged");
      //   var scroll = PDFViewerApplication.pdfViewer.scrollMode;
      //   console.log(scroll);
      //   if (scroll === 3) bookFlip.start();
      //   else bookFlip.stop();
      // }

      var bookFlip = {
        _width: [], //flipbook pages width
        _height: [], //flipbook pages height
        active: false, //flipbook mode on
        _spreadBk: NaN, //spread mode backup to restore
        _evSpread: null, //spread mode changed default event handler 
        _spread: NaN, //spread page mode
        // toStart: false, //PDFjs require flipbook at start
        _intoView: null, //link handler default function
        _visPages: null, //visible pages function
        _ready: false, //ready to start flipbook

        // event listeners when bookFlip need different handling 
        init: function() {
          console.log("It's bookFlip init");

          PDFViewerApplication.eventBus._on('rotationchanging', () => {
            this.rotate()
          });
          PDFViewerApplication.eventBus._on('scalechanging', () => {
            this.resize()
          });
          PDFViewerApplication.eventBus._on('pagechanging', () => {
            this.flip()
          });

          // PDFViewerApplication.eventBus._on('documentinit', () => {
          //   console.log("It's on documentinit");
          //   this.stop();
          //   console.log("It's documentinit and bookFlip stop");
          //   this._ready = false;
          // });

          PDFViewerApplication.eventBus._on('scrollmodechanged', () => {
            console.log("It's on scrollmodechanged");
            var scroll = PDFViewerApplication.pdfViewer.scrollMode;

            console.log(scroll);
            // if (scroll === 3) this.start();
            // else this.stop();
            if (scroll === 3) {
              this._rkeady = true;
              // this.active = true;
              this.start();
              this._intoView = PDFViewerApplication.pdfViewer.scrollPageIntoView;
              this._visPages = PDFViewerApplication.pdfViewer._getVisiblePages;
              } else {
              this._ready = false;
              // this.active = false;
              this.stop();
            }
          });

          PDFViewerApplication.eventBus._on('switchspreadmode', (evt) => {
            console.log("It's on switchspreadmode");
            this.spread(evt.originalEvent.detail.mode);
            PDFViewerApplication.eventBus.dispatch('spreadmodechanged', {
              source: PDFViewerApplication,
              mode: evt.originalEvent.detail.mode
            });
          });

          PDFViewerApplication.eventBus._on('pagesinit', () => {
            console.log("It's on pagesinit");
            this._ready = true;
            // if(this.toStart){
            //   this.toStart = false;
            //   PDFViewerApplication.pdfViewer.scrollMode = 3;
            //   // PDFViewerApplicationOptions.set('scrollModeOnLoad', 3);
            // }
            PDFViewerApplicationOptions.set('scrollModeOnLoad', 3);
            this._intoView = PDFViewerApplication.pdfViewer.scrollPageIntoView;
            this._visPages = PDFViewerApplication.pdfViewer._getVisiblePages;
          });

          // PDFViewerApplication.eventBus._on('baseviewerinit', () => {
          //   console.log("It's on pagesinit");
          //   PDFViewerApplicationOptions.set('scrollModeOnLoad', 3);

          //   this._intoView = PDFViewerApplication.pdfViewer.scrollPageIntoView;
          //   this._visPages = PDFViewerApplication.pdfViewer._getVisiblePages;
          // });

        },
        // startup flipbook
        start: function() {
          console.log("It's flipbook start");

          if (this.active || !this._ready) return;
          this.active = true;

          var viewer = PDFViewerApplication.pdfViewer;

          this._spreadBk = viewer.spreadMode;
          this._spread = (this._spreadBk !== 2) ? 0 : 2;
          viewer.spreadMode = 0;
          viewer._spreadMode = -1;

          this._evSpread = PDFViewerApplication.eventBus._listeners.switchspreadmode;
          PDFViewerApplication.eventBus._listeners.switchspreadmode = null;

          viewer.scrollPageIntoView = (data) => {
            return this.link(data)
          };
          viewer._getVisiblePages = () => {
            return this.load()
          };

          var scale = viewer.currentScale;
          var parent = this;
          $('#viewer .page').each(function() {
            parent._width[$(this).attr('data-page-number')] = $(this).width() / scale;
            parent._height[$(this).attr('data-page-number')] = $(this).height() / scale;
          });

          // $('#viewer').removeClass('pdfViewer').addClass('bookViewer').css({
          //   opacity: 1
          // });
          $('#viewer').removeClass('pdfViewer').addClass('bookViewer')

          var pages = PDFViewerApplication.pagesCount;
          console.log("It's flipbook pagesCount: " + pages);
          for (var page = 3; page < pages + (pages % 2); page++) {
            if (this._height[page] != this._height[page - 1] || this._width[page] != this._width[page - 1]) {
              $('#spreadEven').prop('disabled', true);
              this._spread = 0;
            }
          }

          $('#viewer').turn({
            elevation: 50,
            width: this._size(PDFViewerApplication.page, 'width') * this._spreadMult(),
            height: this._size(PDFViewerApplication.page, 'height'),
            page: PDFViewerApplication.page,
            when: {
              turned: function(event, page) {
                PDFViewerApplication.page = page;
                viewer.update();
              }
            },
            display: this._spreadType()
          });
          console.log("It's turn")
          console.log("It's flipbook start end")
        },
        // shutdown flipbook
        stop: function() {
          console.log("It's flipbook stop");
          if (!this.active) return;
          this.active = false;

          $('#viewer').turn('destroy');

          $('#viewer .page').removeAttr('style');
          $('#viewer').removeAttr('style').removeClass('shadow bookViewer').addClass('pdfViewer');

          var parent = this;
          $('#viewer .page').each(function() {
            var page = $(this).attr('data-page-number');
            $(this).css('width', parent._size(page, 'width')).css('height', parent._size(page, 'height'));
          });

          var viewer = PDFViewerApplication.pdfViewer;
          viewer.scrollPageIntoView();
          viewer._getVisiblePages();

          // viewer.scrollPageIntoView = this._intoView;
          // viewer._getVisiblePages = this._visPages;

          PDFViewerApplication.eventBus._listeners.switchspreadmode = this._evSpread;
          this.setInitialView(document.location.hash.substring(1), {
            rotation: rotation,
            sidebarView: sidebarView,
            scrollMode: scrollMode,
            spreadMode: spreadMode
          });
          // viewer.spreadMode = stored.spreadMode | 0;
          // viewer.spreadMode = viewer.stored.spreadMode;

          console.log("It's stop and pdfViewer");
        },
        // resize flipbook pages
        resize: function() {
          if (!this.active) return;
          var page = PDFViewerApplication.page;
          $('#viewer').turn('size', this._size(page, 'width') * this._spreadMult(), this._size(page, 'height'));
        },
        // rotate flipbook pages
        rotate: function() {
          if (!this.active) return;
          [this._height, this._width] = [this._width, this._height];
          this.resize();
        },
        // change flipbook spread mode
        spread: function(spreadMode) {
          if (!this.active) return;
          this._spread = spreadMode;
          $('#viewer').turn('display', this._spreadType());
          this.resize();
        },
        // turn page
        flip: function() {
          if (!this.active) return;
          $('#viewer').turn('page', PDFViewerApplication.page);
          if (!PDFViewerApplication.pdfViewer.hasEqualPageSizes) this.resize();
        },
        // follow internal links
        link: function(data) {
          if (!this.active) return;
          PDFViewerApplication.page = data.pageNumber;
        },
        // load pages near shown page
        load: function() {
          if (!this.active) return;
          var views = PDFViewerApplication.pdfViewer._pages;
          var arr = [];
          var page = PDFViewerApplication.page;
          var min = Math.max(page - ((this._spread === 0) ? 2 : 3 + (page % 2)), 0);
          var max = Math.min(page + ((this._spread === 0) ? 1 : 3 - (page % 2)), views.length);

          for (var i = min, ii = max; i < ii; i++) {
            arr.push({
              id: views[i].id,
              view: views[i],
              x: 0,
              y: 0,
              percent: 100
            });
          }

          return {
            first: arr[page - min - 1],
            last: arr[arr.length - 1],
            views: arr
          };
        },
        _spreadType: function() {
          return (this._spread === 0) ? 'single' : 'double';
        },
        _spreadMult: function() {
          return (this._spread === 0) ? 1 : 2;
        },
        _size: function(page, request) {
          var size;
          if (request === 'width') size = this._width[page];
          if (request === 'height') size = this._height[page];
          return size * PDFViewerApplication.pdfViewer.currentScale;
        }
      };

      bookFlip.init();

    });
  }
  window.onload = () => {
    //window.location.search - https://css-tricks.com/snippets/javascript/get-url-and-url-parts-in-javascript/
    if (window.location.search == '') {
      loadingInfo('document.pdf')
    }
    if (window.location.search.includes('loadingInfo')) {
      doc = window.location.search.split('(').pop().split(')')[0]
      loadingInfo(doc)
    }
  }

  // let pdfInstance = null;

  // window.initPDFViewer = function(pdfURL) {
  //   pdfjsLib.getDocument(pdfURL).then(pdf => {
  //     pdfInstance = pdf;
  //   });
  // };