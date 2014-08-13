define(function (require, exports, module) {
    var table = require('./mod_compitable');
    var $ = require('jquery');
    var ajax = require('./mod_ajaxManager');
    var slide = require('./mod_Slide');
    var ajaxManager = require('./mod_ajaxManager');
    var cycle = require('./mod_cycleInfo');
    var setTime = 1000 * 60 * 3;
    var allCycle = cycle({ time: setTime });
    var Time = null;
    var map = null;
    var timer = null;
    var inputValue = '';
    var overLayarr = [];
    var rebackCount = 1;
    var productCount = 1;
    var loaded = false;
    var clickObj = null;
    var subid = "0";
    var FeedbackType = 0;
    var tourid = 0;
    var flag=true;
    window.overflag = false;
    window.overLayarr = overLayarr;
    window.$ = $;
    var loadMaker = {
        init: function () {
            var that = this;
            var searchText = window.decodeURIComponent(window.location.href)
            var isHaskey = loadMaker.parseQueryString(searchText);
            if (isHaskey['Keyword']) {
                (inputValue = isHaskey['Keyword']);
            } else {
                inputValue = '';
            };
            if (isHaskey['FeedbackType']) {
                (FeedbackType = isHaskey['FeedbackType']);
                $('.change_list').attr('href', $('.change_list').attr('sethref') + "?FeedbackType=" + FeedbackType);
            } else {
                FeedbackType = '0';
            };
            if (inputValue) {
                flag = false;
            };
            that.addHover();
            $("#searchBtn").val(inputValue);
            $('.item_tab li').each(function (index, obj) {
                $(this).click(function () {
                    var index = $(this).index();
                    var now = $(this).attr('data-type') ? $(this).attr('data-type') : 0;
                    FeedbackType = now;
                    $('.item_tab li').addClass('no_current').removeClass('clicked');
                    $(this).removeClass('no_current').addClass('clicked');
                    that.showItems(index);
                    that.linkAddRequset(FeedbackType);
                    /*点击的时候切换右边的东西;*/
                    if (flag) {
                        $.ajax({
                            url: "../handler/GetFeedbackList.ashx",
                            dataType: "json",
                            data: "request=" + JSON.stringify({ FeedbackType: now, PageSize: 30, PageIndex: 1, SubTourID: subid }),
                            cache: false,
                            type: "POST",
                            beforeSend: function () {
                                that.hideAll('now');
                            },
                            success: function (result) {
                                if (result['FeedbackList'].length == 0) {
                                    that.hideAll('none');
                                }else{
                                    that.hideAll('', true);
                                }
                                that.getFeedList(result);
                            }
                        });
                    }
                });
            });
            $(document).click(function () {
                that.showOrHide();
            });
            $("#masks").click(function (e) {
                if (e.target.className != "imageSlide") {
                    e.stopPropagation();
                } else {
                    overflag = true;
                }
            });
            $('#img_mask').on('click', function (e) {
                e.stopPropagation();
            });
            $('#fullMask').on('click', function (e) {
                if (overflag) {
                    e.stopPropagation();
                };
            });
            $('#rebackBtn').on('click', function (e) {
                var count = $('.clicked').attr('data-type') ? $('.clicked').attr('data-type') : 0;
                that.getMoreReback(count);
            });
            $('#productBtn').on('click', function (e) {
                that.getMoreProduct();
            });
            
            this.addSearchEvent();
            this.loadSummarizeInfo();
            this.addAllEvent();
        },
        linkAddRequset: function (value) {
            var href = $('.change_list').attr('href');
            var newHref = '';
            var request=this.parseQueryString(href);
            if (request['Keyword']) {
                newHref = $('.change_list').attr('sethref') + "?Keyword=" + request['Keyword']+ "&FeedbackType=" + value;
            } else {
                newHref = $('.change_list').attr('sethref') + "?FeedbackType=" + value;
            }
            $('.change_list').attr('href', newHref);
        },
        addHover: function () {
            var obj = $('.item_tab li').addClass('no_current').removeClass('clicked');
            if (FeedbackType == 0) {
                obj.eq(0).addClass('clicked').removeClass('no_current');
            } else {
                obj.filter('li[data-type=' + FeedbackType + ']').addClass('clicked').removeClass('no_current');
            }
            $('.over')
        },
        linkAddRequsetes: function (value) {
            var href = $('.change_list').attr('href');
            var newHref = '';
            var request = this.parseQueryString(href);
            if (request['FeedbackType']) {
                newHref = $('.change_list').attr('sethref') + "?FeedbackType=" + request['FeedbackType'] + "&Keyword=" + value;
            } else {
                newHref = $('.change_list').attr('sethref') + "?Keyword=" + value;
            }
            $('.change_list').attr('href', newHref);
        },
        getMoreReback: function (number) {
            ++rebackCount;
            var that = this;
            var allCount=30 * rebackCount;
            var respons = { FeedbackType: number, PageSize: allCount, PageIndex: 1, SubTourID: subid };
            $.ajax({
                url: "../handler/GetFeedbackList.ashx",
                dataType: "json",
                data: "request=" + JSON.stringify(respons),
                cache: false,
                beforeSend: function () {
                    $('.rebackBtn .isMore').show();
                    $('.productItmesBtn').hide();
                    $('#rebackBtn').hide();
                },
                success: function (result) {
                    $(".visual_list_bar .reback").html('');
                    that.getFeedList(result);
                    if (allCount > result['FeedbackList'].length) {
                        $('#rebackBtn').hide();
                    } else {
                        $('#rebackBtn').show();
                    }
                    $('.rebackBtn .isMore').hide();
                }
            });
        },
        getMoreProduct: function () {
            ++productCount;
            var that = this;
            var allCount = (30 * productCount);
            var respons = { KeywordValue: inputValue, IsFeedback: false, IsProduct: true, PageSize: (30 * productCount), PageIndex: 1 };
            $.ajax({
                url: "../handler/HomePageSearch.ashx",
                dataType: "json",
                type: "POST",
                data: "request=" + JSON.stringify(respons),
                cache: false,
                beforeSend: function () {
                    $('.productItmesBtn .isMore').show();
                    $('.rebackBtn').hide();
                    $("#productBtn").hide();
                },
                success: function (result) {
                    $(".visual_list_bar .productItmes").html('');
                    that.searchCallBack(result);
                    $('.productItmesBtn .isMore').hide();
                    if (allCount > result['ProductInfoList'].length) {
                        $('#productBtn').hide();
                    } else {
                        $('#productBtn').show();
                    }
                    $('.rebackBtn .isMore').hide();
                }
            });
        },
        parseQueryString: function (url) {
            var params = {};
            var arr = url.split("?");
            if (arr.length <= 1)
                return params;
            arr = arr[1].split("&");
            for (var i = 0, l = arr.length; i < l; i++) {
                var a = arr[i].split("=");
                params[a[0]] = a[1];
            }
            return params;
        },
        showItems: function (index) {
            var overlay = $('.overLays');
            var str = 'all';
            if (index == 0) {
                str = 'all';
            } else if (index == 1) {
                str = 'good';
            } else if (index == 2) {
                str = 'bad';
            } else if (index == 3) {
                str = 'lead';
            };
            overlay.removeClass('all').removeClass('lead').removeClass('good').removeClass('bad').addClass(str);
        },
        startGoogleMap: function () {
            var mapOptions = {
                zoom: 3,
                zoomControl: true,
                zoomControlOptions: {
                    style: google.maps.ZoomControlStyle.DEFAULT
                },
                center: new google.maps.LatLng(34.500804932017495, 76.40002380468752),
                /*center: new google.maps.LatLng(31.3210335, 121.52608510000005),*/
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            map = new google.maps.Map(document.getElementById('canvas'), mapOptions);
            google.maps.event.addListener(map, 'zoom_changed', function () {
                var zoom = map.getZoom();
                if (zoom < 3) {
                    map.setZoom(3);
                } else if (zoom > 17) {
                    map.setZoom(17);
                }
            })

            loadMaker.loadMapMaker();
            window.map = map;
        },
        showOrHide: function (show) {
            if (show) {
                $('#masks').show();
                $('#fullMask').show();
            } else {
                $('#masks').hide();
                $('#fullMask').hide();
            }
        },
        upDateMap: function () {
            var that = this;
            window.setInterval(function () {
                // console.log('轮询');
                that.changeMapDate();
           // }, (1000 * 60 * 3))
            }, (setTime))
        },
        changeMapDate: function () {
            var that = this;
            if (subid != "0") {
                that.clickMarkerAjax(subid);
                $('.productItmes').hide();
                that.chooseUpDateALL(tourid, subid);
            } else if ((subid == "0") && inputValue) {
                that.keyUpfn();
                that.showMore(false);
            } else {
                this.loadMapMaker();
            }
        },
        updateTime: function () {
            allCycle.addCallback(function () {
                //更新所有数据
                ajaxManager.GetSummarizeInfo(null, function (data) {
                    if (!Time) {
                        data.CurrentTime = String(data.CurrentTime);
                        var TimeDivide = data.CurrentTime.indexOf(' ');
                        var date = data.CurrentTime.substr(0, TimeDivide).split('-');
                        var time = data.CurrentTime.substr(TimeDivide).split(':');
                        Time = new Date(date[0], date[1]-1, date[2], time[0], time[1], time[2]);
                        var TimeCycle = cycle({ time: 1000 });
                        TimeCycle.addCallback(function () {
                            Time = new Date(Time.setTime(Time.getTime() + 1000));
                            $('.visual_title p').html(GV.util.parse.timeFormat(Time, 'yyyy-MM-dd hh:mm:ss'));
                        });
                    }
                    $('#todayAmount').html(data.TourTotalAmount);
                    $('#customerAmount').html(data.ClientTotalAmount);
                    $('#feedBackAmount').html(data.FeedbackTotalAmount);
                    $('.visual_title p').html(data.CurrentTime);
                });
            });
        },
        loadMapMaker: function () {
            var that = this;
            var makerOverlay = loadMaker.MarkerOverlay();
            var respons = { KeywordValue: inputValue ? inputValue : '', IsFeedback: true, IsProduct: false, PageSize: 30, PageIndex: 1 };
            if (inputValue) {
                that.keyUpfn();
                that.showMore(false);
            } else {
                /*第一次打开页面地图marker*/
                $.ajax({
                    url: "../handler/HomePageSearch.ashx",
                    dataType: "json",
                    type: "POST",
                    data: "request=" + JSON.stringify(respons),
                    cache: false,
                    success: function (result) {
                        that.addMakerCallBack(result);
                        that.showMore(true);
                    }
                });
                /*第一次打开页面反馈列表*/
                $.ajax({
                    url: "../handler/GetFeedbackList.ashx",
                    dataType: "json",
                    data: "request=" + JSON.stringify({ FeedbackType: FeedbackType, PageSize: 30, PageIndex: 1 }),
                    cache: false,
                    type: "POST",
                    beforeSend: function () {
                        that.hideAll('now');
                    },
                    success: function (result) {
                        //console.log(result)
                        that.hideAll('',true);
                        that.getFeedList(result);
                    }
                });
            }
        },
        addClickMask: function (obj) {
            var reg = /clickEvent/;
            var that = this;
            var thatMask = obj;
            var respons = { FeedbackID: thatMask.attr('feedbackid'), FeedbackType: thatMask.attr('feedbacktype') };
            Handlebars.registerHelper('feedObj', function (data, options) {
                var feedObjArr = ["导游", "领队", "餐饮", "司机", "酒店", "景点", "交通", "供应商", "航班", "建议", "签证", "客人", "其它"];;
                if (!isNaN(data)) {
                    return feedObjArr[data - 1];
                }
            });
            $.ajax({
                url: "../handler/GetTourFeedbackInfo.ashx",
                dataType: "json",
                data: "request=" + JSON.stringify(respons),
                cache: false,
                type: "POST",
                success: function (result) {
                    var template = Handlebars.compile(that.maskHmtl());
                    $("#masks").html(template(result));
                    that.showOrHide(true);
                    $('#masks').find('.close').click(function () {
                        that.showOrHide();
                    })
                }
            });
        },
        sendFeedAjax: function (number) {
            var respons = { FeedbackType: number, PageSize: 30, PageIndex: 1 };
            var that = this;
            $.ajax({
                url: "../handler/GetFeedbackList.ashx",
                dataType: "json",
                data: "request=" + JSON.stringify(respons),
                cache: false,
                type: "POST",
                beforeSend: function () {
                    that.hideAll('now');
                },
                success: function (result) {
                    that.hideAll('', true);
                    that.getFeedList(result)
                }
            });
        },
        isHasMarker: function (obj) {
            var all = overLayarr.length
            for (var i = 0; i < all; i++) {
                if (obj['TourID'] == overLayarr[i]['tourid'] && obj['SubTourID'] == overLayarr[i]['subtourid']) {
                    return {
                        result: true,
                        current: overLayarr[i]
                    }
                }
            };
            return {
                result: false,
                current: null
            };
        },
        upDateAllCount: function (result) {
            var count = 0;
            var nums = [parseInt(result.CustomerYesAmount), parseInt(result.CustomerNoAmount), parseInt(result.LeaderDailyAmount)];
            $(".item_tab .num").each(function (index, obj) {
                if (index) {
                    $(this).html(nums[index - 1]);
                    count += nums[index - 1];
                };
            });
            $(".item_tab .num:first").html(count);
        },
        addMakerCallBack: function (result) {
            var makers = result.TourInfoList,
                template = Handlebars.compile(this.markerHtml()),
                makerOverlay = loadMaker.MarkerOverlay(),
                maker = null,
                that = this;
            this.upDateAllCount(result);
            //加载marker到地图上面去
            for (var i = 0, ii = makers.length; i < ii; i++) {
                (function (i) {
                    var html = template(makers[i]);
                    var hasMarker = that.isHasMarker(makers[i]);
                    //轮询过来有相同的话ico_current
                    if (hasMarker.result) {
                        var now = hasMarker.current;
                        //经纬度不同
                        if (now.lat != makers[i]['Lat'] || now.lng != makers[i]['Lng']) {
                                $(now.div).addClass('overLayAnimation').show();
                                now.ondraw(new google.maps.LatLng(makers[i]['Lat'], makers[i]['Lng']), function () {
                                    now.lat = makers[i]['Lat'];
                                    now.lng = makers[i]['Lng'];
                                    var it = $(this);
                                    window.setTimeout(function () {
                                        it.removeClass('overLayAnimation');
                                    }, 1000);
                                });
                            //吐槽数不同;
                        } else if (now.acound.allbackAmount != makers[i]['FeedbackAmount']) {
                            that.upDateHtml(now, makers[i]);
                        }
                    } else {
                        var createMaker = that.markerAdd(makers[i], html);
                        overLayarr.push(createMaker);
                    }
                })(i);
            };
            loaded = true;
        },
        getFeedList: function (result) {
            var template = Handlebars.compile(this.feedHmtl());

            Handlebars.registerHelper('liItmes', function (data, options) {
                var feedObjArr = ["li_good", "li_bad", "li_leader"];;
                if (!isNaN(data)) {
                    return feedObjArr[data - 1];
                }
            });

            Handlebars.registerHelper('setObj', function (data, options) {
                var feedObjArr = ["客人", "客人", "领队"];
                if (!isNaN(data)) {
                    return feedObjArr[data - 1];
                }
            });
            if (30 > result['FeedbackList'].length) {
                $('#rebackBtn').hide();
            } else {
                $('#rebackBtn').show();
            };
            //绑定移入事件
            $(".visual_list_bar .reback li").off();
            $(".visual_list_bar .reback").html(template(result)).show();
            var li = $(".visual_list_bar .reback li");
            li.on('mouseover', function () {
                var subTourID = $(this).attr('subTourID');
                maker = $(".overLays").find("p[subtourid=" + subTourID + "]");
                maker && maker.addClass('hover');//yellow
                maker && maker.parents(".overLays").addClass('maxZindex');
                //map.setCenter(new google.maps.LatLng(36.500804932017495, 79.40002380468752));
                //map.panTo( new google.maps.LatLng(34.500804932017495, 76.40002380468752))
            });
            li.on('mouseout', function () {
                maker && maker.removeClass('hover');//yellow
                maker && maker.parents(".overLays").removeClass('maxZindex');
            });

        },
        loadSummarizeInfo: function () {
            var that = this;
            that.updateTime();
        },
        hideOverLay:function(){
            $.each(overLayarr, function (index,obj) {
                $(obj.div).hide();
            })
        },
        showOverLay: function () {
            $.each(overLayarr, function (index, obj) {
                $(obj.div).show();
            })
        },
        markerAdd: function (makers, html) {
            var during = false;
            if(loaded){
                during=true;
            }else{
                during=false;
            };
            var makerOverlay = loadMaker.MarkerOverlay();
            var createMaker = new makerOverlay({
                map: map,
                html: html,
                lat: makers['Lat'],
                lng: makers['Lng'],
                during: during,
                subtourid: makers['SubTourID'],
                customerNo: makers['CustomerNoAmount'],
                customerYes: makers['CustomerYesAmount'],
                leaderAmount: makers['LeaderDailyAmount'],
                allbackAmount: makers['FeedbackAmount'],
                tourid: makers['TourID'],
                callback: function (obj) {

                }
            });
            return createMaker
        },
        isNullLng: function (lng,lnt) {
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'address': data.DestCity }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var latLng = new google.maps.LatLng(results[0].geometry.location.k, results[0].geometry.location.A);
                    var map = self.updateMap(latLng);
                    var makerOverlay = self.MarkerOverlay();
                    new makerOverlay(map, latLng, data.FeedbackAmount);
                } else {
                    alert("Geocode was not successful for the following reason: " + status);
                }
            });
        },
        upDateHtml: function (obj, value) {
            var thisObj = $(obj.div);
            $(obj.div).show();
            var a = value['CustomerYesAmount'],
                b = value['CustomerNoAmount'],
                c = value['FeedbackAmount'],
                d = value['LeaderDailyAmount'];
            thisObj.addClass('ico_current');
            thisObj.find('.goodss').html(a);
            thisObj.find('.badss').html(b);
            thisObj.find('.allss').html(c);
            thisObj.find('.leadss').html(d);
            obj.acound.allbackAmount = c;
            obj.acound.customerNo = b;
            obj.acound.customerYes = a;
            obj.acound.leaderAmount=d;
        },
        SummarizeInfoHtml: function () {
            var html = '<li><span>今日出团</span><strong>{{TourTotalAmount}}</strong></li>\
                        <li><span>出行人</span><strong>{{ClientTotalAmount}}</strong></li>\
                        <li><span>反馈</span><strong>{{FeedbackTotalAmount}}</strong></li>';
            return html;
        },
        addSearchEvent: function () {
            var that = this;
            $("#searchBtn").on('keyup', function (e) {
                if ((e.keyCode == 13) && ($("#searchBtn").val() != '')) {
                    that.keyUpfn();
                    flag = false;
                } else if ($("#searchBtn").val() == '') {
                    inputValue = '';
                    var links = that.parseQueryString($('.change_list').attr('href'));
                    if (links['FeedbackType']) {
                        $('.change_list').attr("href", $('.change_list').attr('setHref') + "?FeedbackType=" + links['FeedbackType']);
                    } else {
                        $('.change_list').attr("href", $('.change_list').attr('setHref'));
                    }
                    
                    $(".visual_list_bar ul").hide();
                    $(".visual_list_bar ul.reback").show();
                    that.showOverLay();
                    that.loadMapMaker();
                    that.showMore(true);
                    flag = true;
                }
            });
            $(".group_search_wrap .search_btn").on('click', function () {
                if ($("#searchBtn").val() != '') {
                    that.keyUpfn();
                    flag = false;
                }
            });
        },
        keyUpfn: function () {
            var that = this;
            var links = this.parseQueryString($('.change_list').attr('href'));
            inputValue = $("#searchBtn").val();
            if (links['FeedbackType']) {
                $('.change_list').attr("href", $('.change_list').attr("sethref") + "?FeedbackType=" + links['FeedbackType'] + "&Keyword=" + inputValue);
            } else {
                $('.change_list').attr("href", $('.change_list').attr("sethref") +"?Keyword=" + inputValue);
            }
            $(".visual_list_bar .reback").hide();
            var respons = { KeywordValue: $.trim(inputValue), IsFeedback: "false", IsProduct: "true", PageSize: "30", PageIndex: "1" };
            $.ajax({
                url: "../handler/HomePageSearch.ashx",
                dataType: "json",
                data: ("request=" + JSON.stringify(respons).replace(/\+/g, "%2B")),
                type: "POST",
                beforeSend: function () {
                    that.hideAll('now');
                },
                success: function (result) {
                    that.showMore(false);
                    if (result['ProductInfoList'].length == 0) {
                        that.hideAll('none');
                    } else {
                        that.hideAll('', true);
                    }
                    $('#rebackBtn').hide();
                    that.upDateAllCount(result);
                    that.searchCallBack(result);
                    if (30 > result['ProductInfoList'].length) {
                        $('#productBtn').hide();
                    } else {
                        $('#productBtn').show();
                    };
                }
            });
        },
        liItems: function () {
            var html = '{{#ProductInfoList}}<li class="productEvent" subTourID={{SubTourID }}>\
                            <a class="detail productEvent" attrHref="./tour_feedback_list.html?TourID={{TourID}}&SubTourID={{SubTourID}}">\
                                <p class="productEvent"><em class="location productEvent"></em>{{ProductName}}</p>\
                                <span class="group_num productEvent">{{ TourID }}-{{SubTourNO}}</span>\
                            </a>\
                          \
                        </li>{{/ProductInfoList}}';
            return html;
        },
        showMore:function(flag){
            if(flag){
                $('.rebackBtn').css('display', 'block');
                $('.productItmesBtn').hide();
            }else{
                $('.rebackBtn').hide();
                $('.productItmesBtn').css('display', 'block');
            }
        },
        searchCallBack: function (result) {
            var makers = result.TourInfoList;
            var template = Handlebars.compile(this.liItems());
            var templates = Handlebars.compile(this.markerHtml());
            var makerOverlay = this.MarkerOverlay();
            var that = this;
            this.hideOverLay();
            for (var i = 0; i < makers.length; i++) {
                (function (i) {
                    var html = templates(makers[i]);
                    var hasMarker = that.isHasMarker(makers[i]);
                    //轮询过来有相同的话ico_current
                    if (!hasMarker.result) {
                        var createMaker = new makerOverlay({
                            map: map,
                            html: html,
                            lat: makers[i]['Lat'],
                            lng: makers[i]['Lng'],
                            during: true,
                            subtourid: makers[i]['SubTourID'],
                            customerNo: makers[i]['CustomerNoAmount'],
                            customerYes: makers[i]['CustomerYesAmount'],
                            leaderAmount: makers[i]['LeaderDailyAmount'],
                            allbackAmount: makers[i]['FeedbackAmount'],
                            tourid: makers[i]['TourID'],
                            callback: function (obj) {

                            }
                        });
                        overLayarr.push(createMaker);
                    } else {
                        $.each(overLayarr, function (index, obj) {
                            if (obj['tourid'] == makers[i]['TourID'] && obj['subtourid'] == makers[i]['SubTourID']) {
                                $(obj.div).show();
                            }
                        });
                    }
                })(i);
            };
            var dd = template(result);
            if (30 > result['ProductInfoList'].length) {
                $('#productBtn').hide();
            } else {
                $('#productBtn').show();
            };
            var value=$('#searchBtn').val();
            var reg = new RegExp('<a\.>' + value + '</a>', "gi");
            //dd = dd.replace(reg, '<em class="location">' + value + '</em>');
            $(".visual_list_bar .reback").hide();
            //绑定移入事件
            $(".visual_list_bar .productItmes li").off();
            $(".visual_list_bar .productItmes").html('').show().html(dd);
            var li = $(".visual_list_bar .productItmes li");
            li.on('mouseover', function () {
                var subTourID = $(this).attr('subTourID');
                maker = $(".overLays").find("p[subtourid=" + subTourID + "]");
                maker && maker.addClass('hover');//yellow
                maker && maker.parents(".overLays").addClass('maxZindex');
                //map.setCenter(new google.maps.LatLng(36.500804932017495, 79.40002380468752));
                //map.panTo( new google.maps.LatLng(34.500804932017495, 76.40002380468752))
            })
            li.on('mouseout', function () {
                maker && maker.removeClass('hover');//yellow
                maker && maker.parents(".overLays").removeClass('maxZindex');
            });
        },
        addAllEvent: function () {
            var self = this;
            $(".visual_list_bar ul").on('click', function (e) {
                var target = e.target;
                var clickEvent = $(target).hasClass('clickEvent');
                var topEvent = $(target).hasClass('topEvent');
                var productEvent = $(target).hasClass('productEvent');

                //产品点击跳转
                if (productEvent) {
                    var that = $(target).parents('.productEvent').find('.detail');
                    if (inputValue) {
                          window.location.href = that.attr('attrHref') + "&Keyword=" + inputValue;
                        //window.location.href = that.attr('attrHref');
                    } else {
                        window.location.href = that.attr('attrHref');
                    }
                };

                //领队点击跳转
                if (topEvent) {
                    var that = $(target).parents('.liItemes').find('a.topEvent');
                    if (inputValue) {
                        //  window.location.href = that.attr('attrHref') + "&Keyword=" + inputValue;
                        window.location.href = that.attr('attrHref');
                    } else {
                        window.location.href = that.attr('attrHref');
                    }
                };

                //点击弹出弹出层
                if (clickEvent) {
                    var that = $(target).parents('.liItemes').find('.detail');
                    self.addClickMask(that);
                }


            });
        },
        maskHmtl: function () {
            var html = '<a class="close" href="javascript:;">关闭</a>\
                    <h2>{{ProductName}}</h2>\
                    <div class="info_mask_wrap">\
                        <dl>\
                            <dt>团ID：</dt>\
                            <dd>{{ TourID }}</dd>\
                        </dl>\
                        <dl>\
                            <dt>领队姓名：</dt>\
                            <dd>{{ LeaderName }}</dd>\
                        </dl>\
                        <dl>\
                            <dt>反馈类型：</dt>\
                            <dd>{{#feedObj FeedbackObject}}{{/feedObj}}</dd>\
                        </dl>\
                        <dl>\
                            <dt>反馈时间：</dt>\
                            <dd>{{ FeedbackTime }}</dd>\
                        </dl>\
                        <dl>\
                            <dt>反馈来源：</dt>\
                            <dd>{{#if IsAnonymous}} 匿名用户 {{else}}{{ OperatorName }}{{/if}}</dd>\
                        </dl>\
                        <dl>\
                            <dt>反馈内容：</dt>\
                            <dd>{{ FeedbackContent }}</dd>\
                        </dl>\
                        <dl>\
                            <dt>反馈图片：</dt>\
                            <dd>\
                            {{#ImageInfos}}\
                                <a class="imageSlide" href="javascript:;">\
                                 <img class="imageSlide" data-origin={{this.OriginUrl}} ImageID={{ImageID}}  {{# this.ImageSizes}}  src={{this.SizeUrl}} alt="" {{/this.ImageSizes}}>\
                                </a>\
                            {{/ImageInfos}}\
                            </dd>\
                        </dl>\
                    </div>';
            return html;
        },
        markerHtml: function () {
            var html = '<div class="content" style="display:none"><div class="location_pop">\
                            <div class="location_wrap" TourID={{TourID}}  Lng={{Lng}} Lat={{Lat}} SubTourID={{SubTourID}} >\
                                <div class="location_num">\
                                    <p class="num itmes goods">\
                                       <em class="goodss"> {{ CustomerYesAmount }}</em>\
                                        <span>条</span>\
                                    </p>\
                                     <p class="num itmes bads">\
                                         <em class="badss">{{ CustomerNoAmount }}</em>\
                                        <span>条</span>\
                                    </p>\
                                     <p class="num itmes alls">\
                                      <em class="allsss">{{ FeedbackAmount }}</em>\
                                        <span>条</span>\
                                    </p>\
                                      <p class="num itmes leads">\
                                      <em class="leadss">{{ LeaderDailyAmount }}</em>\
                                        <span>条</span>\
                                    </p>\
                                    <a class="btn" href="./tour_feedback_list.html?TourID={{TourID}}&SubTourID={{SubTourID}}">查看反馈</a>\
                                </div>\
                                <div class="location_detail">\
                                    <p class="product"><a target="_black" href={{ProductURL}}>{{ ProductName }}</a></p>\
                                    <p class="name"> {{ TourID }}-{{SubTourNO}}</p>\
                                </div><a class="close" href="javascript:;">×</a>\
                            </div>\
                        </div>\
                        <b class="location_sword"></b></div>\
                        <p class="itmes goods goodss over ico_b ico_yellow_b event" subTourID={{SubTourID }}>{{ ClientNumber }}</p>\
                        <p class="itmes bads badss over ico_b ico_black_b  event"  subTourID={{SubTourID }}>{{ ClientNumber }}</p>\
                        <p class="itmes alls allss over ico_b ico_red_b event" subTourID={{SubTourID }}>{{ ClientNumber}}</p>\
                        <p class="itmes leads leadss over ico_b ico_green_b event" subTourID={{SubTourID }}>{{ ClientNumber }}</p>';
            return html;
        },
        feedHmtl: function () {
            var html = '{{#FeedbackList}}<li class="liItemes {{#liItmes FeedbackType}}{{/liItmes}}" subTourID={{SubTourID }} feedbackID={{FeedbackID }} feedbackType={{FeedbackType }}>\
                    <h3 class="topEvent"><a class="topEvent" attrHref="./tour_feedback_list.html?TourID={{TourID}}&SubTourID={{SubTourID}}">{{ TourID }}-{{SubTourNO}}<i class="topEvent leader{{ FeedbackType }}"></i></a></h3>\
                    <a class="detail clickEvent" href="javascript:;" FeedbackID={{FeedbackID}} FeedbackType={{FeedbackType}}>\
                        <p class="clickEvent">{{ FeedbackContent }}</p>\
                        <span class="clickEvent">{{#setObj FeedbackType}}{{/setObj}}：{{#if IsAnonymous}} 匿名用户 {{else}}{{ OperatorName }}{{/if}}</span>\
                        <span class="clickEvent right">{{ FeedbackTimeDesc }}</span>\
                    </a>\
                </li>\
                {{/FeedbackList}}';
            return html;
        },
        hideAll:function(flag,isNone){
            if (flag == "none") {
                $('.loading_box').show().children().hide().filter('p.loading_none_small').show();
            } else if (flag == "now") {
                $('.loading_box').show().children().hide().filter('p.loading_now_small').show();
            } else if (flag == "fail") {
                $('.loading_box').show().children().hide().filter('p.loading_fail_small').show();
            };
            if (isNone) {
                $('.loading_box').hide().children().hide();
            };
        },
        clickMarkerAjax: function (ids) {
            var that = this;
            var now = $(".item_tab .clicked").attr('data-type') ? $(".item_tab .clicked").attr('data-type') : 0;
            $.ajax({
                url: "../handler/GetFeedbackList.ashx",
                dataType: "json",
                data: "request=" + JSON.stringify({ FeedbackType: now, PageSize: 30, PageIndex: 1, SubTourID: ids }),
                cache: false,
                type: "POST",
                success: function (result) {
                    that.getFeedList(result);
                    if (result['FeedbackList'].length == 0) {
                        that.hideAll('none');
                    }
                }
            });
        },
        chooseUpDateALL:function(value,valuas){
            var respons = { KeywordValue: value, IsFeedback: false, IsProduct: false, PageSize: 30, PageIndex: 1, SubTourID: valuas };
            var that = this;
            $.ajax({
                url: "../handler/HomePageSearch.ashx",
                dataType: "json",
                data: "request=" + JSON.stringify(respons),
                type: "POST",
                success: function (result) {
                    that.upDateAllCount(result)
                }
            });
        },
        MarkerOverlay: function () {
            var that = this;
            var Overlay = function (config) {
                this.map = config.map;
                this.config = config;
                this.text = config.html;
                this.during = config.during
                this.subtourid = config.subtourid;
                this.tourid = config.tourid;
                this.lat = config.lat;
                this.lng = config.lng;
                this.callback = config.callback;
                this.div = null;
                this.acound = { customerNo: this.config.customerNo, customerYes: this.config.customerYes, leaderAmount: this.config.leaderAmount, allbackAmount: this.config.allbackAmount };
                this.setMap(this.map);
            }
            Overlay.prototype = new google.maps.OverlayView();
            $.extend(Overlay.prototype, {
                onAdd: function () {
                    var arr = ['all', 'good', 'bad', 'lead'];
                    var div = document.createElement('div');
                    var obj = null;
                    div.className = "overLays";
                    $(div).addClass(arr[FeedbackType])
                    this.during && $(div).addClass('ico_current');
                    $(div).show();
                    div.innerHTML = this.text;
                    div.style.position = 'absolute';
                    this.getPanes().overlayImage.appendChild(div);
                    this.div = div;
                    this.callback.call(this);
                    $(div).find('.over').on('click', function () {
                        var current = $(div).find('.location_wrap');
                        clickObj && clickObj.find('.content').hide();
                        flag = true;
                        clickObj = $(div);
                        subid = current.attr('subtourid');
                        $(div).find('.content').show();
                        that.clickMarkerAjax(subid);
                        $('.productItmes').hide();
                        map.setCenter(new google.maps.LatLng(current.attr('lat'), current.attr('lng')));
                        map.setZoom(11);
                        tourid = current.attr('tourid')
                        that.chooseUpDateALL(tourid, subid);
                        $('.productItmesBtn').hide();
                    });
                    $(div).find('.close').on('click', function () {
                        $(div).find('.content').hide();
                        subid = "0";
                        tourid = "0";
                        map.setCenter(new google.maps.LatLng(34.500804932017495, 76.40002380468752));
                        map.setZoom(3);
                        if ($('#searchBtn').val() != '') {
                            loadMaker.keyUpfn();
                            loadMaker.hideAll('', true);
                            that.chooseUpDateALL($('#searchBtn').val());
                        } else {
                            var now = $(".item_tab .clicked").attr('data-type') ? $(".item_tab .clicked").attr('data-type') : 0;
                            loadMaker.hideAll('', true);
                            that.chooseUpDateALL("");
                            loadMaker.sendFeedAjax(now);
                        }
                    });
                    $(div).find('.event').on('mouseover', function () {
                        var subTourID = $(div).find('.event').attr('subTourID');
                        var thisLeavel = $('.item_tab .clicked').attr('data-type');
                        obj = $('.productItmes').find("li[subTourID=" + subTourID + "]");
                        thisLeavel && (obj = obj.filter("li[feedbacktype=" + thisLeavel + "]"));
                        obj && obj.addClass('hover');
                    });
                    $(div).find('.event').on('mouseout',function () {
                        obj && obj.removeClass('hover');
                    });
                    $(div).find('.btn').on('click', function () {
                        var text = $(this).attr("href");
                        if (/Keyword/i.test(text)) {
                            var count = text.indexOf('Keyword');
                            var str = text.substring(0, count);
                            str = 'Keyword=' + inputValue;
                        } else {
                            if (inputValue) {
                                $(this).attr("href", text + "&Keyword=" + inputValue);
                            };
                        }
                    });
                },
                draw: function () {
                    var latLng = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.lat, this.lng));
                    this.div.style.left = latLng.x - 14 + 'px';
                    this.div.style.bottom = -latLng.y - 1 + 'px';
                },
                ondraw: function (lag, callback) {
                    var latLng = this.getProjection().fromLatLngToDivPixel(lag);
                    this.div.style.left = latLng.x - 14 + 'px';
                    this.div.style.bottom = -latLng.y - 1 + 'px';
                    callback && callback.call(this.div);
                },
                onRemove: function () {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            });
            return Overlay;
        },
        InfoWindowOverlay: function () {
            var Overlay = function (opt) {
                this.opt = opt;
                this.map = opt;
                this.div = null;
                this.latLng = opt.latLng;
                this.setMap(opt.map);
            }
            Overlay.prototype = new google.maps.OverlayView();
            $.extend(Overlay.prototype, {
                onAdd: function () {
                    var div = document.createElement('div');
                    div.className = 'map_pop';
                    div.innerHTML = this.opt.text;
                    div.style.position = 'absolute';
                    div.style.cursor = 'default';
                    div.style.zIndex = '5';
                    this.getPanes().floatPane.appendChild(div);
                    this.div = div;
                    GV.emit('info-window-added');
                },
                draw: function () {
                    var projection = this.getProjection();
                    var divPixel = projection.fromLatLngToDivPixel(this.latLng);
                    if (!this.noresult) {
                        var offset = $(this.div).offset();
                        var bounds = this.map.getBounds();
                        var ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
                        var sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
                        this.div.style.left = divPixel.x - offset.width / 2 + 15 + 'px';
                        this.div.style.bottom = -(divPixel.y - 45) + 'px';
                        if (divPixel.x > ne.x || divPixel.x < sw.x || divPixel.y < ne.y || divPixel.y > sw.y) {
                            var c = projection.fromLatLngToDivPixel(this.map.getCenter());
                            this.map.panBy(divPixel.x - c.x, divPixel.y - offset.height - ne.y - 110);
                        } else {
                            var x = 0;
                            var y = 0;
                            var adjust = 50;
                            if (divPixel.x > ne.x - 680) {
                                adjust = 110;
                            }
                            if (divPixel.x < (sw.x + 190 + 15)) {
                                x = divPixel.x - (sw.x + 190 + 15);
                            }
                            if (divPixel.x > (ne.x - 190 - 40)) {
                                x = divPixel.x - (ne.x - 190 - 40);
                            }
                            y = (divPixel.y - (offset.height + adjust)) - ne.y;
                            if (x || y) {
                                this.map.panBy(x, y < 0 ? y : 0);
                            }
                        }
                    } else {
                        this.div.style.left = divPixel.x - 70 + 'px';
                        this.div.style.bottom = -(divPixel.y - 85) + 'px';
                    }
                },
                onRemove: function () {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            });
            return Overlay;
        }
    };
 /*   var searchText = window.decodeURIComponent(window.location.href)
    var isHaskey = loadMaker.parseQueryString(searchText)['Keyword'];
    if (isHaskey != '') {
        (inputValue = isHaskey);
    } else {
        inputValue = '';
    }
    $("#searchBtn").val(inputValue);*/
    loadMaker.init();
    window.startGoogleMap = loadMaker.startGoogleMap;
    require.async('http://ditu.google.cn/maps/api/js?sensor=false&callback=startGoogleMap');
    exports.loadMaker = loadMaker;
    window.loadMaker = loadMaker;
    new slide({ imageArr: ".info_mask_wrap a", imageCon: ".info_mask_wrap" });
})