var gWFProcessXML = null,
gCurNode = null,
gArrTacheName = null,
gWFLogXML = null,
gJsonField = null,
gUserAction = "",
gIdeaID = [],
gWQSagent = "(wqsWFSubmitDoc)",
gArrLogUser = [],
gAction = "\u5904\u7406\u5B8C\u6BD5\uFF01",
gPageEvent = {
    "OpenBefore": "",
    "OpenAfter": "",
    "SaveBefore": "",
    "SaveAfter": ""
};
//gAction="存储目标环节点人员";
$(function() {
    if (gIsNewDoc && gWFID == "") {
        //alert("没有可用的流程或没有被激活的流程！\n\n请您联系系统管理员！")
        alert("\u6CA1\u6709\u53EF\u7528\u7684\u6D41\u7A0B\u6216\u6CA1\u6709\u88AB\u6FC0\u6D3B\u7684\u6D41\u7A0B\uFF01\n\n\u8BF7\u60A8\u8054\u7CFB\u7CFB\u7EDF\u7BA1\u7406\u5458\uFF01");
    } else {
        var tmpCurUser = gForm.CurUser.value.replace(/\s/g, ""),
        arrTmpCurUser = tmpCurUser.indexOf(",") > -1 ? tmpCurUser.split(",") : tmpCurUser.split(";");
        if (!gIsEditDoc) {
            if (gWFStatus < 2) {
                var arrUrl = gForm.Path_Info.value.split("?"),
                pathurl = arrUrl[0] + "?EditDocument" + (arrUrl[1].indexOf("&") > -1 ? arrUrl[1].substr(arrUrl[1].indexOf("&")) : "") + "&_=" + (new Date()).getTime();
                if ($.inArray(gUserCName, arrTmpCurUser) > -1) {
					window.location = pathurl;
                    return;
                }
            } else {}
        }
        //读取流程图
        var strView = "vwWFXML";
        if (gWFDebug) {
            strView = "vwWFDebug";
		}
		var Path = "/" + gWorkFlowDB + "/" + strView + "/" + gWFID + ".?OpenDocument";
		//不是新文档时，传递当前文档ID号，用于读取当前文档的流程日志
        if (!gIsNewDoc) {
            Path += "&id="+gCurDocID;
		}
        $.ajax({
            url: Path,
            cache: false,
            dataType: "text",
            success: function(txt) {
                var WFXML = $.parseXML(txt.replace(/[\n\r]/g, ""));
                $.each(WFXML.documentElement.childNodes,
                function(i, item) {
                    if (item.nodeName == "Process") {
                        gWFProcessXML = item
                    } else if (item.nodeName == "Log") {
                        gWFLogXML = item
                    }
                });
                initOnLoad(arrTmpCurUser);
            }
        });
    }
});
function initOnLoad(arrTmpCurUser) {
    //页面装载前执行全局方法
	if(typeof(beforeLoad)!="undefined"){
		beforeLoad();
	}
    //编辑状态下执行
    $.each($('textarea[name^="ID_"]', gForm),
    function(i, item) {
        $("<div></div>").insertBefore(item).attr("id", $(item).attr("name"));
        if (!gIsEditDoc) {
            $(item).remove();
        }
    });
    //gWFProcessXML=dojox.xml.parser.parse(gForm.WFProcessXML.value.replace(/@line@/g,"").replace(/\r|\n|<br\/>|<br>|<p>|<\/p>/g,"")).documentElement;
    if (gIsEditDoc) {
        //alert(gWFLogXML);
        var CurID = gIsNewDoc ? (gWFProcessXML.getAttribute("OriginNode")) : gForm.WFCurNodeID.value;
        gCurNode = $(CurID, gWFProcessXML);
        if (gIsNewDoc) {
            gWFLogXML.setAttribute("OriginRouter", gWFProcessXML.getAttribute("OriginRouter"));
            gForm.WFCurNodeID.value = CurID;
            gForm.WFTacheName.value = getNodeValue(gCurNode[0], "WFNodeName");
        }
        if (gWFStatus < 2) {
            //初始化事件
            $.each($(gForm.WFCurNodeID.value + ">WFOpenBefore", gWFProcessXML),
            function(i, item) {
                gPageEvent["OpenBefore"] = item.getAttribute("value")
            });
            $.each($(gForm.WFCurNodeID.value + ">WFOpenAfter", gWFProcessXML),
            function(i, item) {
                gPageEvent["OpenAfter"] = item.getAttribute("value")
            });
            $.each($(gForm.WFCurNodeID.value + ">WFSaveBefore", gWFProcessXML),
            function(i, item) {
                gPageEvent["SaveBefore"] = item.getAttribute("value")
            });
            $.each($(gForm.WFCurNodeID.value + ">WFSaveAfter", gWFProcessXML),
            function(i, item) {
                gPageEvent["SaveAfter"] = item.getAttribute("value")
            });

            //装载前执行函数
            var _pe = gPageEvent["OpenBefore"];
            if (_pe.replace(/\s/, "") != "") {
                //try{eval(gPageEvent["WFSaveBefore"])}catch(e){alert("页面打开前执行的函数可能未在页面中初始化！");return}
                try {
                    eval(_pe)
                } catch(e) {
                    alert("\u9875\u9762\u6253\u5F00\u524D\u6267\u884C\u7684\u51FD\u6570 < " + _pe + " > \u53EF\u80FD\u672A\u5728\u9875\u9762\u4E2D\u521D\u59CB\u5316\uFF01");
                }
            }
            //装载按钮
            $.each($(gForm.WFCurNodeID.value + ">WFBtnAssign>tr", gWFProcessXML),
            function(i, item) {
                var objBtn = {};
                $.each($("td", item),
                function(idx, item) {
                    if (idx > 0) {
                        var txt = item.getAttribute("value");
                        switch (idx) {
                        case 1:
                            objBtn.name = txt;
                            objBtn.title = txt;
                            break;
                        case 2:
                            objBtn.ico = txt;
                            break;
                        case 3:
                            objBtn.clickEvent = txt;
                            break;
                        case 4:
                            //txt=(txt=="居右"||txt=="居左"?txt=="居右"?"2":"1":txt);
                            txt = (txt == "\u5C45\u53F3" || txt == "\u5C45\u5DE6" ? txt == "\u5C45\u53F3" ? "2": "1": txt);
                            objBtn.align = txt;
                            break;
                        default:
                            objBtn.isHidden = "0";
                        }
                    }
                });
                gArrBtns.push(objBtn);
            });
			//装载附件表格
			//loadAttachGrid(false);
            //字段控制
            $.each($(gForm.WFCurNodeID.value + ">WFFieldStatus", gWFProcessXML),
            function(i, item) {
                var val = item.getAttribute("value");
                if (val != "") {
                    gJsonField = $.parseJSON(val);

                    var _getStatus = function(obj) {
                        for (o in obj) {
                            return o
                        }
                    };
                    var _setStyle = function(obj, tag, type) {
                        try {
                            if (tag == "select") {
                                $(obj).css("background-color", "#fc9")
                            } else if (type == "radio" || type == "checkbox") {
                                if (obj.parentNode && obj.parentNode.tagName.toLowerCase() == "label") {
                                    $(obj.parentNode).css("color", "#f00")
                                }
                            } else if (tag == "div") {
                                var oWFIdea = document.getElementById("WFIdea");
                                if (oWFIdea) {
                                    $(oWFIdea).css("border", gCssBorder)
                                }
                                if ($.grep($(gForm.WFCurNodeID.value, gWFLogXML),
                                function(item) {
                                    var strId = item.getAttribute("idea") ? $.trim(item.getAttribute("idea")) : "";
                                    if (strId == "") {
                                        return true
                                    }
                                }).length > 0) {
                                    $(obj).css("height", "60px")
                                }
                                $(obj).css("border", gCssBorder)
                            } else {
                                $(obj).css("border", gCssBorder)
                            }
                        } catch(e) {}
                    };
                    var _setStatus = function(obj, status, f) {
                        try {
                            var strTagName = obj.tagName.toLowerCase(),
                            strType = obj.type ? obj.type.toLowerCase() : "div";
                            var isMini = ($(obj).attr("class") != undefined) && $(obj).attr("class").split("mini-").length > 1;
                            switch (status) {
                            case "e":
                                /*编辑*/
                                if (f.indexOf("ID_") > -1) {
                                    gIdeaID.push(f)
                                    /*存储意见的ID*/
                                }
                                break;
                            case "r":
                                /*只读*/
                                if (isMini) {
									if (strTagName=="textarea" && f.indexOf("ID_") > -1) {
										$('[name=\"' + f + '\"]', gForm).remove()
									}else{
										$(obj).attr("enabled", false);
									}
                                    break;
                                }
                                switch (strTagName) {
									case "textarea":
										if (f.indexOf("ID_") > -1) {
											$('[name=\"' + f + '\"]', gForm).remove()
										} else {
											obj.setAttribute("disabled", true);
										}
										break;
									case "input":
										if (strType == "text") {
											//obj.setAttribute("readOnly",true);
											$(obj).attr({
												"disabled": true,
												"onclick": null,
												"onfocus": null,
												"onblur": null,
												style: "backgroundImage:none;borderWidth:0"
											});
										} else {
											obj.setAttribute("disabled", true);
										}
										break;
									case "select":
										obj.setAttribute("disabled", true);
									default:
                                }
                                break;
                            case "h":
                                /*隐藏*/
                                if (f.indexOf("js-") > -1) {
                                    $(obj).css("display", "none");
                                } else {
                                    if (strTagName != "textarea") {
                                        if (strType == "radio" || strType == "checkbox") {
                                            if (obj.parentNode && obj.parentNode.tagName.toLowerCase() == "label") {
                                                $(obj.parentNode).css("visibility", "hidden")
                                            }
                                        } else {
                                            $(obj).css("visibility", "hidden");
                                        }
                                        //if(gJsonField[f])delete gJsonField[f];
                                    } else if (strTagName == "textarea") {
                                        if (f.indexOf("ID_") > -1) {
                                            $('[name=\"' + f + '\"]', gForm).empty()
                                        }
                                    }
                                }
                                break;
                            case "s":
                                /*仅部分可见*/
                                if (gJsonField[f].s != "") {
                                    if (_arrSeeUser == null) {
                                        _arrSeeUser = wfFormula(gJsonField[f].s.split("|"), "")
                                    }
                                    if ($.inArray(gUserCName, _arrSeeUser) < 0) {
                                        //if(!dojo.some(_arrSeeUser,function(item){return item==gUserCName})){
                                        if (f.indexOf("js-") > -1) {
                                            $(obj).css("display", "none");
                                        } else {
                                            $(obj).css("visibility", "hidden");
                                        }
                                    } else {
                                        if (f.indexOf("js-") > -1) {
                                            $(obj).css("display", "");
                                        }
                                    }
                                }
                                //if(gJsonField[f])delete gJsonField[f];
                                break;
                            case "w":
                                /*必填*/
                                if (gJsonField[f].w != "") {
                                    if (f.indexOf("ID_") > -1) {
                                        gIdeaID.push(f)
                                        /*存储意见的ID*/
                                    }
                                    if (isMini && (strTagName == "input" || strTagName == "textarea")) {
                                        $(obj).attr("required", true);
                                        break;
                                    }
                                    _setStyle(obj, strTagName, strType);
                                }
                                break;
                            case "m":
                                /*仅部分可见必填*/
                                if (gJsonField[f].m != "") {
                                    var tmp = gJsonField[f].m.split("$$");
                                    if (_arrSeeUser == null) {
                                        _arrSeeUser = wfFormula(tmp[0].split("|"), "")
                                    }

                                    if ($.inArray(gUserCName, _arrSeeUser) < 0) {
                                        //if(!dojo.some(_arrSeeUser,function(item){return item==gUserCName})){
                                        if (f.indexOf("js-") > -1) {
                                            $(obj).css("display", "none");
                                        } else {
                                            $(obj).css("visibility", "hidden");
                                            //dojo.style(obj,"visibility","visible");
                                        }
                                    } else {
                                        if (f.indexOf("js-") > -1) {
                                            $(obj).css("display", "");
                                        }
                                        if (f.indexOf("ID_") > -1) {
                                            gIdeaID.push(f)
                                            /*存储意见的ID*/
                                        }
                                        if (isMini && (strTagName == "input" || strTagName == "textarea")) {
                                            $(obj).attr("required", true);
                                            break;
                                        }
                                        _setStyle(obj, strTagName, strType);
                                    }
                                }
                                break;
                            default:
                            }
                        } catch(e) {
                            alert(e.description)
                        }
                    };
                    var _tmpField = [];
					
                    for (f in gJsonField) {
                        var status = _getStatus(gJsonField[f]),
                        type = "name",
                        _arrSeeUser = null;
                        if (f.indexOf("js-") > -1) {
                            var arrF = $("." + f, gForm);
                        } else {
                            var arrF = $('[' + type + '=\"' + f + '\"]', gForm);
                        }

                        //if(arrF.length==0){alert("\u68C0\u6D4B\u4E0D\u5230\u57DF\u7684\u6807\u8BC6<"+f+">");return}/*检测不到域的标识*/
                        if (arrF.length == 0) {
                            _tmpField.push(f)
                        }
                        /*检测不到域的标识*/
                        $.each(arrF,
                        function(i, item) {
                            _setStatus(item, status, f);
                        })
                    }
                    //if(_tmpField.length>0){alert("检测不到以下域的标识：\n"+_tmpField.join("\n"))}
                    //if(_tmpField.length>0){window.status="\u68C0\u6D4B\u4E0D\u5230\u4EE5\u4E0B\u57DF\u7684\u6807\u8BC6\uFF1A\n"+_tmpField.join("|")}
                    if (_tmpField.length > 0) {
                        alert("\u68C0\u6D4B\u4E0D\u5230\u4EE5\u4E0B\u57DF\u7684\u6807\u8BC6\uFF1A\n" + _tmpField.join("\n"))
                    }
                    /*是否隐藏填写意见区域*/
                    /*王茂林注释
					if(gIdeaID.length<1){
					_HiddenWFIdea()
					}	*/
                }
            });
            //装载后执行函数
            var _pe = gPageEvent["OpenAfter"];
            if (_pe.replace(/\s/, "") != "") {
                //try{eval(gPageEvent["WFSaveBefore"])}catch(e){alert("页面打开后执行的函数可能未在页面中初始化！");return}
                try {
                    eval(_pe)
                } catch(e) {
                    alert("\u9875\u9762\u6253\u5F00\u540E\u6267\u884C\u7684\u51FD\u6570 < " + _pe + " > \u53EF\u80FD\u672A\u5728\u9875\u9762\u4E2D\u521D\u59CB\u5316\uFF01");
                }
            }
        }
    } else {
        /*王茂林注释
		_HiddenWFIdea();
		 */
		 //装载附件表格
		loadAttachGrid(true);
        var _TEST = function(ID) {
            $.each($(ID + ">WFFieldStatus", gWFProcessXML),
            function(i, item) {
                var val = item.getAttribute("value");
                if (val != "") {
                    gJsonField = $.parseJSON(val);
                    var _getStatus = function(obj) {
                        for (o in obj) {
                            return o
                        }
                    };
                    var _setStatus = function(obj, status, f) {
                        try {
                            switch (status) {
                                //case "h":
                                /*隐藏*/
                                //dojo.style(obj,"display","none");
                                //if(gJsonField[f])delete gJsonField[f];
                                //break;
                            case "s":
                                /*仅部分可见*/
                                if (gJsonField[f].s != "") {
                                    if (_arrSeeUser == null) {
                                        _arrSeeUser = wfFormula(gJsonField[f].s.split("|"), "")
                                    }

                                    if ($.inArray(gUserCName, _arrSeeUser) < 0) {
                                        //if(!dojo.some(_arrSeeUser,function(item){return item==gUserCName})){
                                        $(obj).css("display", "none");
                                    } else {
                                        $(obj).css("display", "");
                                    }
                                }
                                //if(gJsonField[f])delete gJsonField[f];
                                break;
                            default:
                            }
                        } catch(e) {}
                    };
                    for (f in gJsonField) {
                        if (f.indexOf("js-") > -1) {
                            var status = _getStatus(gJsonField[f]),
                            _arrSeeUser = null;
                            $.each($("." + f, gForm),
                            function(i, item) {
                                //alert(_arrSeeUser);
                                _setStatus(item, status, f);
                                //alert(_arrSeeUser);
                            })
                        } else {
                            if (gJsonField[f]) delete gJsonField[f];
                        }
                    }
                }
            })
        };
        if (gWFStatus > 1) {
            /*阅读模式并且流程结束，各个域的控制*/
            //字段控制
            var RID = gForm.WFPreNodeID.value;
            if ($.trim(RID) != "") {
                _TEST(RID.substr(RID.lastIndexOf("N")))
            }
        } else {
            var _arrID = [];
            $.each($('[user="' + gUserCName + '"]', gWFLogXML),
            function(i, item) {
                var _id = item.nodeName;
                if ($.inArray(_id, _arrID) < 0) {
                    _arrID.push(_id);
                    _TEST(_id)
                }
            })
        }
    }
    if (gCloseBtn.length > 0) {
        gArrBtns = gArrBtns.concat(gCloseBtn)
    };
    //var btndom = "<a class='mini-button'></a>";
	var btndom = "<a class='button'></a>";
    $("#btnCont").empty(); //alert(gArrBtns.length)
    gArrBtns = $.grep(gArrBtns,
    function(item) {
        return item.isHidden != "1";
    });
    $.each(gArrBtns,
    function(i, e) {
        var gBtn=$(e.align == "1" ? $(btndom).appendTo("#btnContL") : $(btndom).appendTo("#btnContR"))
		gBtn.html("<span>&nbsp;&nbsp;"+getBtnName(e.name)+"&nbsp;&nbsp;</span>");
		gBtn.addClass(getClsName(e.name));
		gBtn.css("margin","5px");
		gBtn.attr({
            text: getBtnName(e.name),
            title: getBtnName(e.title),
            id: (e.id ? e.id: ""),
            iconCls: e.ico,
            plain: true,
            onClick: e.clickEvent,
            style: "font-size:12px;font-family:'Microsoft YaHei';"
        }) //.bind("click",function(){eval(e.clickEvent)});
    });
    mini.parse();
    
    if (!gIsNewDoc) {
        //生成意见
        if (gWFLogXML.childNodes) {
            var sTacheNum = 1,
            DataPrefix = DataSuffix = strId = WFIdeaPrefix = WFIdeaSuffix = "";
            $.each(gWFLogXML.childNodes,
            function(i, item) {
				if(typeof(unionIdea)=="undefined" || !unionIdea){
					strId = item.getAttribute("id") ? $.trim(item.getAttribute("id")) : "";
					if (strId.indexOf("ID_") > -1) {
						var _time = item.getAttribute("time"),
						_tdID = "td" + strId + sTacheNum,
						_idea = DecodeHtml(item.getAttribute("idea")),
						_mark = item.getAttribute("mark");
						WFIdeaPrefix = '<table cellspacing=1 cellpadding=1 id="showWFIdea"><tr><td class="tdIdea" id="' + _tdID + '" ' + (_mark != 'undefined' && _mark == '1' ? 'style="color:red;font-weight:bold"': '') + '>&nbsp;</td></tr>';
						//WFIdeaSuffix='<tr><td class="tdIdeaUser" title="具体时间：'+_time+'">'+item.getAttribute("user")+'&nbsp;&nbsp;<span>'+_time.split(" ")[0]+'</span></td></tr></table>';
						WFIdeaSuffix = '<tr><td class="tdIdeaUser" title="\u5177\u4F53\u65F6\u95F4\uFF1A' + _time + '">' + item.getAttribute("user").replace(/[0-9]/g, "") + '&nbsp;&nbsp;<span>' + _time + '</span></td></tr></table>';
						$("#" + strId).append("<div>" + WFIdeaPrefix + WFIdeaSuffix + "</div>");
						$("td#" + _tdID).empty().append(_idea);
					}
				}else{
					if(typeof(document.getElementById("ideaArea"))=="undefined"){
						alert("\u610f\u89c1\u663e\u793a\u533a\u57df\u672a\u5b9a\u4e49\u3002");//意见显示区域未定义
					}else{
						
						strId = "ID_ideaArea";
						/*var _time = item.getAttribute("time"),
						_tache=item.getAttribute("tache"),
						_tdID = "td" + strId + sTacheNum,
						_idea = DecodeHtml(item.getAttribute("idea")),
						_mark = item.getAttribute("mark");
						WFIdeaPrefix = '<table cellspacing=1 cellpadding=1 id="showWFIdea"><tr><td class="techename">'+_tache+'</td></tr><tr><td class="tdIdea" id="' + _tdID + '" ' + (_mark != 'undefined' && _mark == '1' ? 'style="color:red;font-weight:bold"': '') + '>&nbsp;</td></tr>';
						//WFIdeaSuffix='<tr><td class="tdIdeaUser" title="具体时间：'+_time+'">'+item.getAttribute("user")+'&nbsp;&nbsp;<span>'+_time.split(" ")[0]+'</span></td></tr></table>';
						WFIdeaSuffix = '<tr><td class="tdIdeaUser" title="\u5177\u4F53\u65F6\u95F4\uFF1A' + _time + '">' + item.getAttribute("user").replace(/[0-9]/g, "") + '&nbsp;&nbsp;<span>' + _time + '</span></td></tr></table>';
						$("#" + strId).append("<div>" + WFIdeaPrefix + WFIdeaSuffix + "</div>");
						$("td#" + _tdID).empty().append(_idea);*/
						if(item.getAttribute("idea")!=undefined){
							var _time = item.getAttribute("time"),
								_tache=item.getAttribute("tache"),
								_tdID = "td" + strId + sTacheNum,
								_idea = DecodeHtml(item.getAttribute("idea"))==""?"\u9605\u3002":DecodeHtml(item.getAttribute("idea")),//如果意见为空则显示“阅。”
								_mark = item.getAttribute("mark");
							WFIdeaPrefix = '<table cellspacing=1 cellpadding=1 id="showWFIdea" style="width:100%"><tr><td class="techename" style="width:150px;text-align:center">'+_tache+'</td><td class="tdIdea" id="' + _tdID + '" ' + (_mark != 'undefined' && _mark == '1' ? 'style="color:red;font-weight:bold;"': '') + '>&nbsp;</td>';
							//WFIdeaSuffix='<tr><td class="tdIdeaUser" title="具体时间：'+_time+'">'+item.getAttribute("user")+'&nbsp;&nbsp;<span>'+_time.split(" ")[0]+'</span></td></tr></table>';
							WFIdeaSuffix = '<td class="tdIdeaUser" style="width:250px;text-align:left" title="\u5177\u4F53\u65F6\u95F4\uFF1A' + _time + '"><span style="width:100px;float:left;text-align:center">' + item.getAttribute("user").replace(/[0-9]/g, "") + '</span><span style="float:left">' + _time + '</span></td></tr></table>';
							$("#" + strId).append("<div onmousemove='this.style.backgroundColor=\"#e1dfdf\"' onmouseout='this.style.backgroundColor=\"#fff\"'>" + WFIdeaPrefix + WFIdeaSuffix + "</div>");
							$("td#" + _tdID).empty().append(_idea);
						}
					}
				}
                sTacheNum++;
            });

            if (gWFStatus < 2) {} else {
                var _LoadField = function() {
                    $.ajax({
                        url: encodeURI("/" + gWorkFlowDB + "/pgReadField?OpenPage&N=" + gWFModule + "-" + gFormType),
                        dataType: "text",
                        cache: false,
                        success: function(txt) {
                            if (txt != "") {
                                var arrField = eval("[" + txt + "]");
                                $.each(arrField,
                                function(i, item) {
                                    var id = item.split("|")[1],
                                    type = "name";
                                    if (id.indexOf("ID_") > -1) {
                                        type = "id";
                                        var arrF = $('[' + type + '=\"' + id + '\"]', gForm);
                                        if (arrF.length == 0) {
                                            type = "name";
                                        }
                                    }
                                    var arrF = $('[' + type + '=\"' + id + '\"]', gForm);
                                    //if(arrF.length==0){alert("\u68C0\u6D4B\u4E0D\u5230\u57DF\u7684\u6807\u8BC6<"+id+">");return}//检测不到域的标识
                                    if (arrF.length == 0) {
                                        _tmpField.push(id)
                                    } //检测不到域的标识
                                    $.each(arrF,
                                    function(i, obj) {
                                        obj.setAttribute("disabled", true)
                                    })
                                });
                                //if(_tmpField.length>0){alert("检测不到以下域的标识：\n"+_tmpField.join("\n"))}
                                if (_tmpField.length > 0) {
                                    alert("\u68C0\u6D4B\u4E0D\u5230\u4EE5\u4E0B\u57DF\u7684\u6807\u8BC6\uFF1A\n" + _tmpField.join("\n"))
                                }
                            }
                        }
                    })
                };
                if (gIsEditDoc) {
                    _LoadField()
                };
            }
        }

    }
	/*
    var _gIsLoadDateJS = function() {
        //try{return gIsLoadDateJS===true||gIsLoadDateJS===false}catch(e){return false}
        try {
            return gIsLoadDateJS
        } catch(e) {
            return false
        }
    };
    if (gIsEditDoc && _gIsLoadDateJS()) {
        var oHead = document.getElementsByTagName('HEAD').item(0);
        var oScript = document.createElement("script");
        oScript.type = "text/javascript";
        oScript.src = "/ht/My97DatePicker/WdatePicker.js";
        oHead.appendChild(oScript);
    }*/
	//页面装载后执行全局方法
	if(typeof(afterLoad)!="undefined"){
		afterLoad();
	}
}
function getNodeValue(node, name) {
    var reValue = "";
    $.each($(name, node),
    function(i, item) {
        reValue = item.getAttribute("value").replace(/@line@/g, "");
    });
    return $.trim(reValue);
}

function fnResumeDisabled() {
    //$("input[disabled],textarea[disabled],select[disabled]").removeAttr("disabled"); //恢复部分域的失效状态，以保证“文档保存”时值不会变为空
	$("input[disabled],textarea[disabled],select[disabled]").prop("disabled",false);
}
function wfSubDocStart() {
	var isLock=false;
	var lastPerson="";//最后一次保存人
	try{
		if(!gIsNewDoc){
			$.ajax({
				url:'/'+gCommonDB+"/(agtGetSubTime)?openagent&id="+gCurDocID+"&db="+gCurDBName,
				cache: false,
				dataType:'text',
				async:false,
				success:function(txt){
					if($.trim(txt)!="" && (mini.formatDate(mini.parseDate($.trim(txt).split("^")[0]),"yyyy-MM-dd HH:mm:ss")!=mini.formatDate(mini.parseDate(gSubTime),"yyyy-MM-dd HH:mm:ss"))){
						isLock=true;
						lastPerson=$.trim(txt).split("^")[1];
					}
				}
			});
		}
	}catch(e){isLock=false}
	if(isLock){
		//在您提交前[xxx]已经对文件进行了提交操作，请您刷新页面重新提交.
		alert("\u5728\u60a8\u63d0\u4ea4\u524d\u0020\u005b"+lastPerson+"\u005d\u0020\u5df2\u7ecf\u5bf9\u6587\u4ef6\u8fdb\u884c\u4e86\u63d0\u4ea4\u64cd\u4f5c\uff0c\u8bf7\u60a8\u5237\u65b0\u9875\u9762\u91cd\u65b0\u63d0\u4ea4\u002e");
		return;
	}
    var objCurNode = $(gForm.WFCurNodeID.value, gWFProcessXML);
    var isWFOrg = getNodeValue(objCurNode[0], "WFWithOrg");
    if (arguments.length == 1) {
        gWQSagent = arguments[0];
    }
    //页面提交前执行
    var _pe = gPageEvent["SaveBefore"];
    if (_pe.replace(/\s/, "") != "") {
        //try{eval(gPageEvent["WFSaveBefore"])}catch(e){alert("页面提交前执行的函数可能未在页面中初始化！");return}
        try {
            var _f = eval(_pe);
            if (typeof _f != "undefined") {
                if (!_f) {
                    return
                }
            }
        } catch(e) {
            alert("\u9875\u9762\u63D0\u4EA4\u524D\u6267\u884C\u7684\u51FD\u6570 < " + _pe + " > \u53EF\u80FD\u672A\u5728\u9875\u9762\u4E2D\u521D\u59CB\u5316\uFF01");
        }
    }
    //检测必填字段
    var _U = function(o, s) {
        return typeof(o[s]) != "undefined"
    };
    var _C = function(f, bw, bm) {
        if (bw) {
            if (gJsonField[f].w != "") {
                alert(gJsonField[f].w)
            }
        } else {
            var tmp = gJsonField[f].m.split("^");
            if ($.inArray(gUserCName), tmp[0].split("|") > -1) {
                if (tmp[1] != "") {
                    alert(tmp[1])
                }
            } else {
                return false
            }
        }
        return true
    };
    var bw = false,
    bm = false,
    _tmpField = [];

    for (f in gJsonField) {
        if (f.indexOf("js-") < 0) {
            be = _U(gJsonField[f], "e"),
            bw = _U(gJsonField[f], "w"),
            bm = _U(gJsonField[f], "m"),
            bObjHTML = true;
            var objMini = (mini.getbyName(f) != "" ? mini.getbyName(f) : false);
            if (be || bw || bm) {
                if (bObjHTML) {
                    var objHTML = $('[name=\"' + f + '\"]', gForm);
                    //if(objHTML.length>0){objHTML=objHTML[0]}else{window.status="\u68C0\u6D4B\u4E0D\u5230\u57DF\u7684\u6807\u8BC6<"+f+">";return}/*检测不到域的标识*/
                    if (objHTML.length > 0) {
                        objHTML = objHTML[0]
                    } else {
                        _tmpField.push(f);
                        continue
                    }
                    /*将检测不到域的标识放入到临时数组中*/
                    //if(objHTML.length>0){objHTML=objHTML[0]}else{alert("检测不到域的标识<"+f+">");return}/*检测不到域的标识*/
                }
                if (objMini) {
                    objMini.validate();
                    if (!objMini.isValid()) {
                        objMini.focus();
                        _C(f, bw, bm);
                        return;
                    }
                } else {
                    var type = objHTML.type ? objHTML.type.toLowerCase() : "div";
                    if (type == "radio" || type == "checkbox") {
                        var tmp = $('input[name=\"' + f + '\"][type=' + type + ']:checked', gForm);
                        if (tmp.length < 1) {
                            if (_C(f, bw, bm)) {
                                objHTML.focus();
                                return;
                            }
                        }
                    } else {
                        if ($.trim(objHTML.value) == "") {
                            if ((!be) && _C(f, bw, bm)) {
                                objHTML.focus();
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    if (_tmpField.length > 0) {
        alert("\u68C0\u6D4B\u4E0D\u5230\u4EE5\u4E0B\u57DF\u7684\u6807\u8BC6\uFF1A\n" + _tmpField.join("\n"))
    }
    gArrTacheName = []; //清空
    if (!gIsNewDoc) {
        /*
		多人审批，及多人顺序审批
		 */
        if (objCurNode.length == 1) {
            var strAppoveStyle = "",
            strSequenceApprove = "",
            intApproveNum = 0,
            tmpGetValue = "";
            strSequenceApprove = getNodeValue(objCurNode[0], "WFSequenceApprove");
            strAppoveStyle = getNodeValue(objCurNode[0], "WFApproveStyle");
            tmpGetValue = getNodeValue(objCurNode[0], "WFApproveNum");
            if (tmpGetValue != "") {
                intApproveNum = parseInt(tmpGetValue, 10)
            }
            if (strAppoveStyle == "\u591A\u4EBA") { //多人
                //if(strAppoveStyle=="多人"){//多人
                var arrFinishUser = [],
                strWF = gForm.WFFinishApproval.value.replace(/\s/g, ""),
                bGo2Next = true;
                if (strWF != "") {
                    arrFinishUser = strWF.split(";")
                };
                if ($.grep(arrFinishUser,
                function(item) {
                    return $.trim(item) == gUserCName
                }).length == 0) {
                    arrFinishUser.push(gUserCName)
                }
                gForm.WFFinishApproval.value = arrFinishUser.join(";");
                if (strSequenceApprove == "\u662F") { //是
                    //if(strSequenceApprove=="是"){//是
                    /*
					如果是所人审批情况：最好能逐一添加人员进行处理，当第二个人以后审批时，通知方式可以读取与当前节点相关的路由
					如果当前审批人是领导，有相关的督办人员，督办人员可督促，可协办处理。这种情况时，CurUser存放2个人，一个是领导人，一个是督办人。(待开发)
					 */
                    if ($.trim(gForm.WFWaitApproval.value) == "") {
                        gForm.WFWaitApproval.value = "";
                        bGo2Next = false;
                    } else {
                        var arrWaitUsers = gForm.WFWaitApproval.value.replace(/\s/g, "").split(";");
                        gForm.CurUser.value = arrWaitUsers[0];
                        gForm.WFWaitApproval.value = arrWaitUsers.slice(1).join(";");
                    }
                } else {
                    var strUser = gForm.CurUser.value.replace(/\s/g, "");
                    //if(strUser==""){alert("文档不能进行流转！\n\n当前审批人不应为空，请联系管理员！");return}
                    if (strUser == "") {
                        alert("\u6587\u6863\u4E0D\u80FD\u8FDB\u884C\u6D41\u8F6C\uFF01\n\n\u5F53\u524D\u5BA1\u6279\u4EBA\u4E0D\u5E94\u4E3A\u7A7A\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                        return
                    }
                    var arrCurUser = strUser.split(";");
                    var arrNewCurUser = $.grep(arrCurUser,
                    function(item) {
                        return $.trim(item) != gUserCName
                    });
                    if (intApproveNum > 0) {
                        /*有人数限制*/
                        if (intApproveNum == arrFinishUser.length) {
                            /*已经审批完的人数等于规定审批人数，表示已处理完毕*/
                            bGo2Next = false;
                        } else {
                            if (arrNewCurUser.length > 0) {
                                gForm.CurUser.value = arrNewCurUser.join(";")
                            } else {
                                /*审批总人数小于所设置的审批人数（即待审批人已为空）*/
                                bGo2Next = false
                            }
                        }
                    } else {
                        if (arrCurUser.length == 1) {
                            bGo2Next = false;
                        } else {
                            gForm.CurUser.value = arrNewCurUser.join(";");
                        }
                    }
                }
                if (bGo2Next) {
                    var bWFAgreeMark = 0;
                    $('[source="' + gForm.WFCurNodeID.value + '"]', gWFProcessXML).each(function(i, item) {
                        if (getNodeValue(item, "WFAgreeMark") == "\u662F") {
                            bWFAgreeMark = 1
                        }
                    });
                    //您确定提交吗？
                    if (confirm("\u60A8\u786E\u5B9A\u63D0\u4EA4\u5417\uFF1F")) {
                        wfSubDocEndSave(false, bWFAgreeMark)
                    } else {
                        gForm.WFStatus.value = gWFStatus
                    }
                    //if(confirm("您确定提交吗？")){wfSubDocEndSave(bGo2Next)}
                    return
                }
            }
        }
    }
    /*
	直连：两个节点间无任何干扰直接传递；
	唯一选择：在环节名称列表中存在；
	条件选择：满足某种条件后，方可在环节名称列表中存在；
	条件直连：满足某种条件后，不在环节列表中存在，直接提交到下一环节；
	阅办:可临时用于可传阅给其他人员办理。
	 */

    gForm.WFStatus.value = 1;
    var arrEdges = $('[source="' + gForm.WFCurNodeID.value + '"]', gWFProcessXML);
    if (arrEdges.length == 1) {
        //一个路由线时，连接类型只能是唯一或直连
        //直连时，不需要弹出框，直接提交给下一环节已经定义好的审批人。
        //唯一选择时，需要弹出框，提交给所选择的人。
        //注：下一环节点为结束节点时，是特殊情况，需加注意。
        //dojo.forEach(dojo.query("WFRelationType",arrEdges[0]),function(item){
        var vRelationType = getNodeValue(arrEdges[0], "WFRelationType");
        if (vRelationType != "") {
            //var tarID=arrEdges[0].getAttribute("target"),strTacheName="流程结束";
            var tarID = arrEdges[0].getAttribute("target"),
            strTacheName = "\u6D41\u7A0B\u7ED3\u675F";

            ClearRepeat("WFRouterID", arrEdges[0].nodeName); //增加路由线
            //if(vRelationType=="直连"){
            if (vRelationType == "\u76F4\u8FDE") {
                if (!confirm("\u60A8\u786E\u5B9A\u63D0\u4EA4\u5417\uFF1F")) {
                    gForm.WFStatus.value = gWFStatus;
                    return
                };
                //if(!confirm("您确定提交吗？")){return};
                if (tarID.indexOf("E") > -1) {
                    gForm.WFStatus.value = 2;
                    wfSubDocEnd("", [], strTacheName);
                    return
                }
                /*结束节点*/
                var nxtNode = $(tarID, gWFProcessXML);
                if (nxtNode.length == 1) {
                    if (nxtNode[0].getAttribute("nType") != "Judge") {
                        strTacheName = getNodeValue(nxtNode[0], "WFNodeName");
                        tmpValue = getNodeValue(nxtNode[0], "WFActivityOwner");
                        strAppoveStyle = getNodeValue(nxtNode[0], "WFApproveStyle");
                        var strFormula = getNodeValue(nxtNode[0], "WFFormula");
                        if (tmpValue != "") {
                            gArrLogUser = wfFormula(tmpValue.split("|"), strFormula);
                            if (gArrLogUser.length == 1) {
                                wfSubDocEnd(tarID, [gArrLogUser[0]], strTacheName)
                            } else {
                                if (strAppoveStyle != "\u591A\u4EBA") { //多人
                                    //if(strAppoveStyle!="多人"){//
                                    //alert("在路由关系为直连情景下，\n\n如果下一环节处理人多于1人，\n\n下一环节点中<审批方式>必须设置为<多人>才能进行提交！\n\n请您联系管理员解决此问题。");
                                    alert("\u5728\u8DEF\u7531\u5173\u7CFB\u4E3A\u76F4\u8FDE\u60C5\u666F\u4E0B\uFF0C\n\n\u5982\u679C\u4E0B\u4E00\u73AF\u8282\u5904\u7406\u4EBA\u591A\u4E8E1\u4EBA\uFF0C\n\n\u4E0B\u4E00\u73AF\u8282\u70B9\u4E2D\3C\u5BA1\u6279\u65B9\u5F0F\3E\u5FC5\u987B\u8BBE\u7F6E\u4E3A\3C\u591A\u4EBA\3E\u624D\u80FD\u8FDB\u884C\u63D0\u4EA4\uFF01\n\n\u8BF7\u60A8\u8054\u7CFB\u7BA1\u7406\u5458\u89E3\u51B3\u6B64\u95EE\u9898\u3002");
                                } else {
                                    wfSubDocEnd(tarID, gArrLogUser, strTacheName);
                                    return;
                                }
                            }
                        } else {
                            //alert("没有找到下一环节的处理人，请您联系管理员！");
                            alert("\u6CA1\u6709\u627E\u5230\u4E0B\u4E00\u73AF\u8282\u7684\u5904\u7406\u4EBA\uFF0C\u8BF7\u60A8\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                        }
                    } else {
                        /*决策节点需更改*/
                        var sTip = getNodeValue(nxtNode[0], "WFAlert");
                        if (sTip != "") {
                            var otWinDlg = dijit.byId('otWinDlg');
                            if (otWinDlg == null) {
                                //\u51B3\u7B56
                                //otWinDlg = new dijit.Dialog({title:"决策",id:"otWinDlg",onDownloadEnd:function(){var arrBtns=[{name:"是",clickEvent:dojo.query("WFYesFn",nxtNode[0])[0].getAttribute("value")+";wfJudge2Next('"+tarID+"')",align:"2",isHidden:"0"},{name:"否",clickEvent:dojo.query("WFNoFn",nxtNode[0])[0].getAttribute("value")+";wfJudge2Next('"+tarID+"')",align:"2",isHidden:"0"}];DrawToolsBar("tSubmitDocActionBar",arrBtns,{border:0,bgImage:0});dojo.byId("tipContent").innerHTML=sTip},onHide:function(){gForm.WFStatus.value=gWFStatus;this.destroyDescendants()}});
                                otWinDlg = new dijit.Dialog({
                                    title: "\u51B3\u7B56",
                                    id: "otWinDlg",
                                    onDownloadEnd: function() {
                                        var arrBtns = [{
                                            name: "\u662F",
                                            clickEvent: dojo.query("WFYesFn", nxtNode[0])[0].getAttribute("value") + ";wfJudge2Next('" + tarID + "')",
                                            align: "2",
                                            isHidden: "0"
                                        },
                                        {
                                            name: "\u5426",
                                            clickEvent: dojo.query("WFNoFn", nxtNode[0])[0].getAttribute("value") + ";wfJudge2Next('" + tarID + "')",
                                            align: "2",
                                            isHidden: "0"
                                        }];
                                        DrawToolsBar("tSubmitDocActionBar", arrBtns, {
                                            border: 0,
                                            bgImage: 0
                                        });
                                        dojo.byId("tipContent").innerHTML = sTip
                                    },
                                    onHide: function() {
                                        try {
                                            gForm.WFStatus.value = gWFStatus
                                        } catch(e) {};
                                        this.destroyDescendants()
                                    }
                                });
                                dojo.body().appendChild(otWinDlg.domNode);
                            }
                            otWinDlg.set("href", "/" + gCommonDB + "/htmWFJudgeDlg?ReadForm");
                            //dojo.query("form").style({display:"none"});
                            otWinDlg.show();
                        } else {
                            wfJudge2Next(tarID);
                        }
                    }
                } else {
                    //alert("下一环节点不存在，请联系管理员！");return;
                    alert("\u4E0B\u4E00\u73AF\u8282\u70B9\u4E0D\u5B58\u5728\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                    return;
                }
                //}else if(vRelationType=="唯一选择"){
            } else if (vRelationType == "\u552F\u4E00\u9009\u62E9") {
                if (tarID.indexOf("E") > -1) {
                    gForm.WFStatus.value = 2;
                    wfSubDocEnd("", [], strTacheName);
                    return
                }
                /*结束节点*/
                strTacheName = getNodeValue(arrEdges[0], "WFNodeDetail");
                strTacheNameSelect = getNodeValue(arrEdges[0], "WFTacheNameSelect");
                gArrTacheName.push([strTacheName, tarID + "^" + arrEdges[0].nodeName, strTacheNameSelect]);
                var oWinDlg = mini.get('oWinDlg');
                if (!oWinDlg) {
					oWinDlg=new mini.Window();
                    oWinDlg.set({
                        id: "oWinDlg",
                        title: '\u9009\u62e9\u5904\u7406\u4eba',
                        //选择处理人
                        url: '',
                        allowDrag: false,
                        allowResize: false,
                        showModal: true,
                        enableDragProxy: false,
                        showFooter: true,
                        showCloseButton: false,
                        footerStyle: "padding:6px 12px;",
                        width: 510,
                        height: 460
                    });
					oWinDlg.show();
                    mini.mask({
                        el: oWinDlg.getEl(),
                        cls: 'mini-mask-loading',
                        html: '\u5217\u8868\u52a0\u8f7d\u4e2d...' //列表加载中...
                    });
                    $.ajax({
                        url: '/' + gCommonDB + '/htmWFTechSel?openpage&s=select',
                        async: true,
                        dataType: 'text',
                        success: function(e) {
                            var selOrgDom = e;
                            oWinDlg.setBody(selOrgDom);
                            oWinDlg.setFooter("<div id='SubmitDocActionBar' style='text-align:right'></div>");
                            setTimeout(function(){wfAddToolbar("oWinDlg");},10);
                            loadOrgTree();
                            mini.unmask(oWinDlg.getEl());
                        }
                    })
                } else {
                    oWinDlg.show()
                }
            } else {
                //alert("路由定义错误！\n\n请联系管理员！");return;
                alert("\u8DEF\u7531\u5B9A\u4E49\u9519\u8BEF\uFF01\n\n\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                return;
            }
        }
        //})
    } else {
        /*
		多条路由情况：
		1、多条唯一线
		2、多条唯一线与条件选择或条件直连组合，注意：（只要条件直连满足其它的都无需在进行判断，直接进行提交;常用于“拒绝”、“同意”）
		3、
		 */
		var bWinDlg=false;
		$.each(arrEdges,function(index,edge){
            var vRelationType = getNodeValue(edge, "WFRelationType"),
            tmpValue = "",
            bReturn = true;
            if (vRelationType == "\u6761\u4EF6\u76F4\u8FDE") {
                //条件直连；此环境下，无需弹出框，该功能常用于“拒绝”、“同意”等类似情况较多。
                tmpValue = getNodeValue(edge, "WFCondition");
                if (tmpValue != "") {
                    if (wfFormulaCompare(gForm, tmpValue)) {
                        ClearRepeat("WFRouterID", edge.nodeName); //增加路由线
                        var tarID = edge.getAttribute("target");
                        if (tarID.indexOf("E") > -1) {
                            gForm.WFStatus.value = 2;
                            //wfSubDocEnd("",[],"流程结束");
                            wfSubDocEnd("", [], "\u6D41\u7A0B\u7ED3\u675F");
                        } else {
                            var nxtNode = $(tarID, gWFProcessXML);
                            if (nxtNode.length == 1) {
                                strTacheName = getNodeValue(nxtNode[0], "WFNodeName");
                                tmpValue = getNodeValue(nxtNode[0], "WFActivityOwner");
                                var strFormula = getNodeValue(nxtNode[0], "WFFormula");
                                if (tmpValue != "") {
                                    gArrLogUser = [];
                                    $.each($(tarID, gWFLogXML),
                                    function(i, item) {
                                        var _u = item.getAttribute("user");
                                        if (_u) {
                                            if ($.inArray(_u, gArrLogUser) < 0) {
                                                gArrLogUser.push(_u + "^P")
                                            }
                                        }
                                    });
                                    //
                                    //	拒绝有两种可能:
                                    //		1、拒绝回去的环节点已经参与过审批
                                    //		2、环节点未参与审批
                                    //	不管参与与否，只要检测到该环节点存在多人时，如果所要提交到的环节设置的多人审批，则不弹出对话，否则弹出选择唯一人员。
                                    //	如果以环节点已参与，并且仅有一人参与过，不过是否“多人处理”，就直接进行提交，否则弹出选择。
                                    //	同意情景同上。
                                    //
                                    if (gArrLogUser.length == 0) {
                                        gArrLogUser = $.map(wfFormula(tmpValue.split("|"), strFormula),
                                        function(item) {
                                            return item + "^P"
                                        })
                                    }
                                    var arrLogUser = [];
                                    $.each(gArrLogUser,
                                    function(i, item) {
                                        if ($.inArray(item, arrLogUser) < 0) {
                                            arrLogUser.push(item)
                                        }
                                    });
                                    gArrLogUser = arrLogUser;
                                    if (!(strAppoveStyle != "\u591A\u4EBA" && gArrLogUser.length > 1)) {
                                        wfSubDocEnd(tarID, gArrLogUser, strTacheName);
                                    } else {
                                        var oCheckUserDlg = new mini.Window();
										oCheckUserDlg.set({
                                            id: "oCheckUserDlg",
                                            title: '\u9009\u62e9\u5904\u7406\u4eba',
                                            //选择处理人
                                            allowDrag: true,
                                            allowResize: false,
                                            showModal: true,
                                            enableDragProxy: false,
                                            showFooter: true,
                                            footerStyle: "padding:6px 12px;",
                                            showCloseButton: false,
                                            width: 510,
                                            height: 460
                                        });
										oCheckUserDlg.show();
                                        mini.mask({
                                            el: oCheckUserDlg.getEl(),
                                            cls: 'mini-mask-loading',
                                            html: '\u5217\u8868\u52a0\u8f7d\u4e2d...' //列表加载中...
                                        });
                                        $.ajax({
                                            url: '/' + gCommonDB + '/htmWFTechSel?openpage&s=selected',
                                            async: true,
                                            dataType: 'text',
                                            success: function(e) {
                                                var selOrgDom = e;
                                                oCheckUserDlg.setBody(selOrgDom);
                                                oCheckUserDlg.setFooter("<div id='SubmitDocActionBar' style='text-align:right'></div>");
                                                var arrBtns = [{
                                                    name: "\u786E\u5B9A",
                                                    title: "\u786E\u5B9A\u5E76\u63D0\u4EA4",
                                                    ico: "icon-ok",
                                                    clickEvent: "wfSubDocProcess('" + tarID + "','" + strTacheName + "','','empTarget')",
                                                    align: "2",
                                                    isHidden: "0"
                                                },
                                                {
                                                    name: "\u5173\u95ED",
                                                    title: "\u5173\u95ED",
                                                    ico: "icon-cancel",
                                                    clickEvent: "mini.get('oCheckUserDlg').destroy();gForm.WFTacheName.value='';",
                                                    align: "2",
                                                    isHidden: "0"
                                                }];
                                                var btnHtml = "";
                                                for (var i = 0; i < arrBtns.length; i++) {
                                                    btnHtml = "<a class='mini-button' plain=true iconCls='" + arrBtns[i].ico + "'>" + arrBtns[i].name + "</a>";
                                                    $(btnHtml).appendTo("#SubmitDocActionBar").attr('onClick', arrBtns[i].clickEvent);
                                                }
                                                mini.parse();
                                                wfAddCheckUser();
                                                mini.unmask(oCheckUserDlg.getEl());
                                            }
                                        })
                                    }
                                } else {
                                    //alert("没有找到下一环节的处理人，请您联系管理员！");
                                    alert("\u6CA1\u6709\u627E\u5230\u4E0B\u4E00\u73AF\u8282\u7684\u5904\u7406\u4EBA\uFF0C\u8BF7\u60A8\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                                }
                            }
                        }
						bWinDlg=false;
                        bReturn = false;
                    }
                } else {
                    //路由条件不能为空！
                    alert("\u8DEF\u7531\u6761\u4EF6\u4E0D\u80FD\u4E3A\u7A7A\uFF01\n\n\u8BF7\u60A8\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                    bWinDlg=false;
					bReturn = false;
                }
            } else if (vRelationType == "\u76F4\u8FDE") {
                //多条分支时，不允许使用“直连”。请您联系系统管理员！
                alert("\u591A\u6761\u5206\u652F\u65F6\uFF0C\u4E0D\u5141\u8BB8\u4F7F\u7528\u201C\u76F4\u8FDE\u201D\u3002\n\n\u8BF7\u60A8\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                bWinDlg=false;
				bReturn = false;
            } else {
                if (vRelationType == "\u552F\u4E00\u9009\u62E9") { //唯一选择
                    tmpValue = getNodeValue(edge, "WFNodeDetail");
                    if (tmpValue != "") {
                        strTacheNameSelect = getNodeValue(edge, "WFTacheNameSelect");
                        gArrTacheName.push([tmpValue, edge.getAttribute("target") + "^" + edge.nodeName, strTacheNameSelect])
                    }
					bWinDlg=true; //允许弹出窗口
                } else {
                    tmpValue = getNodeValue(edge, "WFCondition");
                    if (tmpValue != "") {
                        //条件选择时，满足条件就加入环节选择
                        if (wfFormulaCompare(gForm, tmpValue)) {
                            tmpValue = getNodeValue(edge, "WFNodeDetail");
                            if (tmpValue != "") {
                                strTacheNameSelect = getNodeValue(edge, "WFTacheNameSelect");
                                gArrTacheName.push([tmpValue, edge.getAttribute("target") + "^" + edge.nodeName, strTacheNameSelect]);
                            }
							bWinDlg=true; //允许弹出窗口
                        }
                    }
                }
				
            }
            return bReturn;			
		});
		if(bWinDlg){
            var oWinDlg = mini.get('oWinDlg');
            if (!oWinDlg) {
                oWinDlg=new mini.Window();
                oWinDlg.set({
                    id: "oWinDlg",
                    title: '\u9009\u62e9\u5904\u7406\u4eba',
                    //选择处理人
                    url: '',
                    allowDrag: false,
                    allowResize: false,
                    showModal: true,
                    enableDragProxy: false,
                    showFooter: true,
                    footerStyle: "padding:6px 12px;",
                    showCloseButton: false,
                    width: 510,
                    height: 460
                });
				oWinDlg.show();
                mini.mask({
                    el: oWinDlg.getEl(),
                    cls: 'mini-mask-loading',
                    html: '\u5217\u8868\u52a0\u8f7d\u4e2d...' //列表加载中...
                });
                $.ajax({
                    url: '/' + gCommonDB + '/htmWFTechSel?openpage&s=select',
                    async: true,
                    dataType: 'text',
                    success: function(e) {
                        var selOrgDom = e;
                        oWinDlg.setBody(selOrgDom);
                        oWinDlg.setFooter("<div id='SubmitDocActionBar' style='text-align:right'></div>");
                        setTimeout(function(){wfAddToolbar("oWinDlg");},10);
                        loadOrgTree();
                        mini.unmask(oWinDlg.getEl());
                    }
                });
            } else {
                oWinDlg.show()
            }
		}
    }
}
function wfAddCheckUser() {
    listbox = mini.get('userList');
    $.each(gArrLogUser,
    function(idx, item) {
        listbox.addItem($.parseJSON('{"name":"' + item.split("^")[0] + '","id":"' + item.split("^")[0] + '"}'));
    })
}
function wfSubDocProcess(tarID, TacheName, TacheID, empid) {
    var arrUser = [];
    var lst = mini.get("selectList");
    /*兼容手机*/
    if (lst.data.length > 0) {
        arrUser = $.map(lst.data,function(e){return e.name;});
        var objCurNode = $(tarID, gWFProcessXML);
        if (objCurNode.length == 1) {
            strAppoveStyle = getNodeValue(objCurNode[0], "WFApproveStyle");
            if (strAppoveStyle == "" && arrUser.length > 1) {
                //alert("仅允许选择一个人！");
                alert("\u4EC5\u5141\u8BB8\u9009\u62E9\u4E00\u4E2A\u4EBA\uFF01");
                $("#SubmitDocActionBar").css({
                    display: ""
                });
                return
            }
        }	
        ClearRepeat("WFRouterID", TacheID); //增加路由线
        wfSubDocEnd(tarID, arrUser, TacheName);
    } else {
        //alert("请选择相关人员！");
        alert("\u8BF7\u9009\u62E9\u76F8\u5173\u4EBA\u5458\uFF01");
        $("#SubmitDocActionBar").css({
            display: ""
        });
    }
}
function wfSubDocEnd(tarID, Users, TacheName) {
    var bWFAgreeMark = 0;
    $('[source="' + gForm.WFCurNodeID.value + '"]', gWFProcessXML).each(function(i, item) {
        if (item.getAttribute("target") == tarID) {
            if (getNodeValue(item, "WFAgreeMark") == "\u662F") {
                bWFAgreeMark = 1
            }
        }
    });
    gForm.WFPreNodeID.value = gForm.WFCurNodeID.value;
    gForm.WFCurNodeID.value = tarID;
    gForm.WFTacheName.value = TacheName;
    if (gForm.WFFinishApproval.value == "") {
        gForm.WFPreUser.value = gForm.CurUser.value;
    } else {
        gForm.WFPreUser.value = gForm.WFFinishApproval.value;
        gForm.WFFinishApproval.value = "";
    }
    var bWrite = true,
    arrUsers = wfFormula(Users, "");
    /*此处不需要确定是否网页公式*/
    if (tarID != "") {
        var objCurNode = $(tarID, gWFProcessXML);
        if (objCurNode.length == 1) {
            var strAppoveStyle = "",
            strSequenceApprove = "";
            strAppoveStyle = getNodeValue(objCurNode[0], "WFApproveStyle");
            strSequenceApprove = getNodeValue(objCurNode[0], "WFSequenceApprove");
            if (strAppoveStyle == "\u591A\u4EBA") {
                //if(strAppoveStyle=="多人"){
                if (strSequenceApprove == "\u662F") {
                    //if(strSequenceApprove=="是"){
                    gForm.CurUser.value = arrUsers[0];
                    gForm.WFWaitApproval.value = arrUsers.slice(1).join(";");
                    bWrite = false;
                }
            }
        }
    }
    if (bWrite) {
        gForm.CurUser.value = arrUsers.join(";")
    };
    wfSubDocEndSave(true, bWFAgreeMark);
}
function ClearRepeat(source, target) {
    var arrAllUser = gForm[source].value.replace(/\s/g, "").split(";");
    //if(!dojo.some(arrAllUser,function(item){return dojo.trim(item)==target})){arrAllUser.push(target)}
    if ($.inArray(target, arrAllUser) < 0) {
        if (target != "") arrAllUser.push(target)
    }
    gForm[source].value = arrAllUser.join(";");
}
function wfJudge2Next(curID) { //待更改
    /*
	条件选择：会弹出对话框进行下一环节人员选择；
	条件直连：无需弹出对话框，直接传送到下一环节；
	 需更改*/
    //dijit.byId('otWinDlg').hide();
    var arrEdges = $('[source="' + curID + '"]', gWFProcessXML);
    gArrTacheName = [];
    $.each(arrEdges,
    function(i, edge) {
        var tarID = edge.getAttribute("target");
        var vRelationType = getNodeValue(edge, "WFRelationType");
        if (vRelationType != "") {
            //if(vRelationType.indexOf("条件选择")>-1){
            if (vRelationType.indexOf("\u6761\u4EF6\u9009\u62E9") > -1) {
                tmpValue = getNodeValue(edge, "WFCondition");
                if (tmpValue != "") {
                    if (wfFormulaCompare(gForm, tmpValue)) {
                        tmpValue = getNodeValue(edge, "WFNodeDetail");
                        if (tmpValue != "") {
                            strTacheNameSelect = getNodeValue(edge, "WFTacheNameSelect");
                            gArrTacheName.push([tmpValue, tarID + "^" + edge.nodeName, strTacheNameSelect]);
                            var oWinDlg = mini.get('oWinDlg');
                            if (!oWinDlg) {
                                oWinDlg=new mini.Window();
								oWinDlg.set({
                                    id: "oWinDlg",
                                    title: '\u9009\u62e9\u5904\u7406\u4eba',
                                    //选择处理人
                                    url: '',
                                    allowDrag: false,
                                    allowResize: false,
                                    showModal: true,
                                    enableDragProxy: false,
                                    showFooter: true,
                                    footerStyle: "padding:6px 12px;",
                                    showCloseButton: false,
                                    width: 510,
                                    height: 460
                                });
								oWinDlg.show();
                                mini.mask({
                                    el: oWinDlg.getEl(),
                                    cls: 'mini-mask-loading',
                                    html: '\u5217\u8868\u52a0\u8f7d\u4e2d...' //列表加载中...
                                });
                                $.ajax({
                                    url: '/' + gCommonDB + '/htmWFTechSel?openpage&s=select',
                                    async: true,
                                    dataType: 'text',
                                    success: function(e) {
                                        var selOrgDom = e;
                                        oWinDlg.setBody(selOrgDom);
                                        oWinDlg.setFooter("<div id='SubmitDocActionBar' style='text-align:right'></div>");
                                        setTimeout(function(){wfAddToolbar("oWinDlg");},10);
                                        loadOrgTree();
                                        mini.unmask(oWinDlg.getEl());
                                    }
                                })
                            } else {
                                oWinDlg.show()
                            }
                        }
                    }
                    //});
                }
                //}else if(vRelationType.indexOf("条件直连")>-1){
            } else if (vRelationType.indexOf("\u6761\u4EF6\u76F4\u8FDE") > -1) {
                tmpValue = getNodeValue(edge, "WFCondition");
                if (tmpValue != "") {
                    //dojo.forEach(dojo.query("WFCondition",edge),function(item){
                    if (wfFormulaCompare(gForm, tmpValue)) {
                        var nxtNode = $(tarID, gWFProcessXML);
                        if (nxtNode.length == 1) {
                            ClearRepeat("WFRouterID", edge.nodeName); //增加路由线
                            strTacheName = getNodeValue(nxtNode[0], "WFNodeName");
                            wfSubDocEnd(tarID, getNodeValue(nxtNode[0], "WFActivityOwner").split("|"), strTacheName);
                        }
                    }
                    //});
                }
            } else {
                //alert("条件未满足，无法提交！\n\n请联系管理员！");return;
                alert("\u6761\u4EF6\u672A\u6EE1\u8DB3\uFF0C\u65E0\u6CD5\u63D0\u4EA4\uFF01\n\n\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\uFF01");
                return;
            }
        }
        //});
    });
}
function wfAddTacheName() {
    /*增加环节名称*/
	var obj=mini.get("selTacheName"), selValue="", arrVal=[], tempData={}, _index="";
	for (var intM = 0, intL = gArrTacheName.length; intM < intL; intM++) {
		tempData.id=gArrTacheName[intM][0] + "^" + gArrTacheName[intM][1];
		tempData.name=gArrTacheName[intM][0];
        if (gArrTacheName[intM][2] == "\u662F") {
            _index = tempData.id;
        }
		arrVal.push(tempData);
		tempData={};
    }
	obj.set({data:arrVal});
	obj.setValue(_index);
	wfSelTacheChange(obj);
}
function wfDlgBtnSave() {
    if (mini.get("selTacheName").value == "") {
        alert("\u73AF\u8282\u540D\u79F0\u4E3A\u7A7A\uFF0C\u8BF7\u60A8\u5148\u9009\u62E9\uFF01"); //环节名称为空，请您先选择！
        return
    }
    //if(!confirm("您确定提交吗？")){return};
    if (!confirm("\u60A8\u786E\u5B9A\u63D0\u4EA4\u5417\uFF1F")) {
        gForm.WFStatus.value = gWFStatus;
        return
    };
    $("#SubmitDocActionBar").css({
        display: "none"
    });
    var arrVal = mini.get("selTacheName").value.split("^");
    wfSubDocProcess(arrVal[1], arrVal[0], arrVal[2], "empTarget");
}
function wfSelTacheChange(tacID) {
    /*改变环节名称*/
    var listbox = mini.get('selectList');
    listbox.removeAll();
    listbox = mini.get('tacheList');
    listbox.removeAll();
    var strFormula = "";
    $.each($(tacID.value.split("^")[1], gWFProcessXML),
    function(i, item) {
        strFormula = getNodeValue(item, "WFFormula");
    });
    $.each($(tacID.value.split("^")[1] + ">WFActivityOwner", gWFProcessXML),
    function(i, item) {
        $.each(wfFormula(item.getAttribute("value").split("|"), strFormula),
        function(idx, item) {
            listbox.addItem($.parseJSON('{"name":"' + item + '","id":"' + item + '"}'));
        })
    })
}
function AddValue(name, id) {
    var listbox = mini.get(id);
    var tarID = ((mini.get("selTacheName")!=undefined)&&(mini.get("selTacheName").value!="")) ? mini.get("selTacheName").value.split("^")[1] : "";
    if (tarID != "") {
        var objCurNode = $(tarID, gWFProcessXML); //alert(objCurNode.length)
        if (objCurNode.length == 1) {
            var strAppoveStyle = getNodeValue(objCurNode[0], "WFApproveStyle");
            if (strAppoveStyle == "" && listbox.data.length > 0) {
                //alert("仅允许选择一个人！");
                alert("\u4EC5\u5141\u8BB8\u9009\u62E9\u4E00\u4E2A\u4EBA\uFF01");
                $("#SubmitDocActionBar").css({
                    display: ""
                });
                return
            }
        }
    }
    if ($.grep(listbox.data,
    function(item) {
        return name == item.name;
    }).length > 0) {
        alert("'" + name + "' \u5df2\u5b58\u5728\uff01");
        return;
    } //XXX已存在
    var strJson = '{"name":"' + name + '","id":"' + name + '"}';
    var objJson = $.parseJSON(strJson);
    listbox.addItem(objJson);
}
function DelValue(e) {
    e.sender.removeItem(e.sender.getSelected());
}
function EncodeHtml(s) {
    s = s || '';
    s = s.replace(/&/g, '&amp;');
    s = s.replace(/"/g, '&quot;');
    s = s.replace(/\'/g, '&#39;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/\n/g, '&lt;br&gt;');
    s = s.replace(/\s/g, '&amp;nbsp;');
    return s;
}
function DecodeHtml(s) {
    s = s || '';
    s = s.replace(/&amp;/g, '&');
    //s=s.replace(/&quot;/g,'"');
    //s=s.replace(/&#39;/g,"'");
    //s=s.replace(/&lt;/g,'<');
    //s=s.replace(/&gt;/g,'>');
    //s=s.replace(/&#xa;/g,'\n');
    s = s.replace(/&lt;br&gt;/g, '<br>');
    return s;
}

function wfFormulaCompare(objFM, ConditionFormula) {
	ConditionFormula=ConditionFormula.replace(/\s/g,"");
    try {
        if ($.trim(ConditionFormula) == "") {
            return false
        }
		if(ConditionFormula.indexOf("{")>-1&&ConditionFormula.indexOf("}")>-1){
			var arrItem = (ConditionFormula.match(/\(\{.*?}\)|\{.*?}/ig));
			$.each(arrItem,
			function(i, item) {
				var tmp = item,v="",bC=tmp.match(/\(\{.*?}\)/ig);
				if(bC){
					item = item.substr(2).slice(0, -2);
				}else{
					item = item.substr(1).slice(0, -1);
				}
				if(mini.getbyName(item)){
					v=mini.getbyName(item).getFormValue()?mini.getbyName(item).getFormValue():mini.getbyName(item).getValue();
				}else{
					var leftObj = objFM[item];//公式中的域对象
					var _tag = (typeof leftObj.length != "undefined")?leftObj[0].tagName.toLowerCase():leftObj.tagName.toLowerCase();
					var _type = (typeof leftObj.length != "undefined")?leftObj[0].type:leftObj.type;
					if (_tag == "input") {
						if (typeof leftObj.length == "undefined") {
							v = leftObj.value
						} else {
							var varr=[];
							$.each($('input[name="' + item + '"][type="' + _type + '"]:checked', objFM),
							function(i, item) {
								varr.push(item.value.toString());
							});
							v=varr.join(',');
						}
					} else if (_tag == "textarea" || _tag == "select") {
						v = leftObj.value
					} else {
						return false
					}
				}
				if (bC) {
					v=""?0:v;
					v=parseFloat(v);
				}else{
					v="'"+v+"'";
				}
				ConditionFormula = ConditionFormula.replace(tmp, v)
			});
			return eval(ConditionFormula);
		}else{
			var arrFormulaOR = ConditionFormula.split("|"); //分离或的比较,因为|最后比较
			var arrS = $.grep(arrFormulaOR,function(FormulaOR) {
					var _fnOR = function(FormulaOR) {
						var arrFormulaAnd = FormulaOR.split("&"); //分离与的比较
						var arrAnd = $.grep(arrFormulaAnd,function(Formula) {
								var _Compare = function(c, Formula) {
									var arrText = Formula.split(c),
									bT = (arrText[1].indexOf("'") > -1 || arrText[1].indexOf("\"") > -1),
									leftValue = "",
									leftObj = {},
									rightValue = new String(arrText[1].replace(/[\'\"]/g, ""));
									rightValue = rightValue.split(',').join('');
									if(typeof(mini.getbyName(arrText[0]))!="undefined"){
										leftValue = mini.getbyName(arrText[0]).getFormValue()?mini.getbyName(arrText[0]).getFormValue():mini.getbyName(arrText[0]).getValue();
										leftValue = leftValue.split(',').join('');
									}else{
										leftObj = objFM[arrText[0]];
										var _tag = leftObj.length?leftObj[0].tagName.toLowerCase():leftObj.tagName.toLowerCase();
										var _type = leftObj.length?leftObj[0].type:leftObj.type;
										if (_tag == "input") {
											if (typeof leftObj.length == "undefined") {
												leftValue = leftObj.value
											} else {
												$.each($('input[name="' + arrText[0] + '"][type="' + _type + '"]:checked', objFM),
												function(i, item) {
													leftValue += item.value.toString()
												});
											}
										} else if (_tag == "textarea" || _tag == "select") {
											leftValue = leftObj.value
										} else {
											return false
										}
									}
									if (!bT) {
										var Num1 = parseFloat(leftValue),
										Num2 = parseFloat(arrText[1]);
									}
									switch (c) {
										case "<>":
											if (bT) {
												return leftValue != rightValue;
											} else {
												return Num1 != Num2;
											}
											break;
										case "=":
											if (bT) {
												return leftValue == rightValue;
											} else {
												return Num1 == Num2;
											}
											break;
										case "<=":
											return Num1 <= Num2;
											break;
										case ">=":
											return Num1 >= Num2;
											break;
										case ">":
											return Num1 > Num2;
											break;
										case "<":
											return Num1 < Num2;
											break;
										default:
									}
								};
								var _X = function(f, s) {
									return f.indexOf(s) > -1
								};
								var _fnAND = function(Formula) {
									if (_X(Formula, "<>")) {
										return _Compare("<>", Formula);
									} else if (_X(Formula, "<=") || _X(Formula, "=<")) {
										return _Compare("<=", Formula);
									} else if (_X(Formula, "=>") || _X(Formula, ">=")) {
										return _Compare(">=", Formula);
									} else if (_X(Formula, "=")) {
										return _Compare("=", Formula);
									} else if (_X(Formula, ">")) {
										return _Compare(">", Formula);
									} else if (_X(Formula, "<")) {
										return _Compare("<", Formula);
									} else {
										arrText = Formula.split("@");
										return objFM[arrText[0]].value.indexOf(arrText[1].replace(/[\"\']/g, "")) > -1;
									}
								};
								return _fnAND(Formula);
							});
						return arrAnd.length == arrFormulaAnd.length;
					};
					return _fnOR(FormulaOR);
				});
			//}catch(e){alert("公式比较失败！\n\n字段名可能不存在或者字段名大小写不正确\n\n可能提交按钮函数中未进行赋值！");return false}
			return arrS.length > 0;
		}
    } catch(e) {
        alert("\u516C\u5F0F\u6BD4\u8F83\u5931\u8D25\uFF01\n\n\u5B57\u6BB5\u540D\u53EF\u80FD\u4E0D\u5B58\u5728\u6216\u8005\u5B57\u6BB5\u540D\u5927\u5C0F\u5199\u4E0D\u6B63\u786E\n\n\u53EF\u80FD\u63D0\u4EA4\u6309\u94AE\u51FD\u6570\u4E2D\u672A\u8FDB\u884C\u8D4B\u503C\uFF01");
        return false
    }
}
//退出窗口时解锁
/*dojo.addOnUnload(function () {
	if (gForm.Query_String.value.indexOf("EditDocument") > -1) {
		//if((!gIsNewDoc)&&gIsEditDoc){
		if (gForm.DocLock.value == "1" && gForm["$$QuerySaveAgent"].value == "") {
			if (gWFStatus < 2) {
				var args = "&TDB=" + gCurDBName + "&ID=" + gCurDocID;
				dojo.xhrGet({
					url : encodeURI("/" + gCommonDB + "/(agtDocUnLock)?OpenAgent" + args),
					preventCache : true,
					sync : true,
					load : function (txt) {
						//if(parseInt(txt,10)==1){alert("文档成功解锁！")}
						//if(parseInt(txt,10)==1){alert("\u6587\u6863\u6210\u529F\u89E3\u9501\uFF01")}
					}
				});
			}
		}
		//}
	}
});*/
/*--------------------------------------Common--------------------------------------*/
function wfSubDocEndSave(bGo2Next, bWFAgreeMark) {
    //var bGo2Next=true;
    //if(arguments.length>0){bGo2Next=arguments[0]}
    try {
        //gForm.tempUserName.value = gUserCName
    } catch(e) {};
    /*安全性高时用，不能删除*/
    /*添加流转信息*/
    var tmpNode = $.parseXML("<" + gCurNode[0].nodeName + "/>").documentElement,
    strIdea = "",
    bCloneNode = true;
    tmpNode.setAttribute("tache", getNodeValue(gCurNode[0], "WFNodeName"));
    /*
	if(strSign!=""){
	user=strSign.split("\u3000")[0]
	},user=gUserCName,objWFSign=dojo.byId("WFSign"),strSign=objWFSign?objWFSign.innerHTML:"";
	 */
    //判断当前审批人是否有委托---（王茂林，未完善）
    tmpNode.setAttribute("user", gUserCName);
    tmpNode.setAttribute("time", gServerTime);
    //if(bGo2Next){gAction=gUserCName+"\u63D0\u4EA4\u7ED9\u4E86"+gForm.CurUser.value+"。"}
    if (bGo2Next) {
        if (gForm.WFTacheName.value == "\u6D41\u7A0B\u7ED3\u675F") {//流程结束
            gAction = gUserCName + "\u5904\u7406\u5B8C\u6BD5\uFF01"
        } else {
            gAction = gUserCName + "\u63D0\u4EA4\u7ED9\u4E86" + gForm.CurUser.value + "\u3002"
        }
    }
    //if(bGo2Next){gAction=gUserCName+"提交给了"+gForm.CurUser.value+"."}
    tmpNode.setAttribute("action", gAction);
    /*处理完毕*/
    tmpNode.setAttribute("mark", bWFAgreeMark);
    if (gIdeaID.length > 0) {
        $.each(gIdeaID,
        function(i, id) {
            var cloneNode = tmpNode;
            cloneNode.setAttribute("id", id);
            $.each($('[name=\"' + id + '\"]', gForm),
            function(i, item) {
                strIdea = item.value
            });
            cloneNode.setAttribute("idea", EncodeHtml(strIdea));
            $(cloneNode).appendTo(gWFLogXML);
            cloneNode = null;
            bCloneNode = false;
        });
    }
    if (bCloneNode) {
        $(tmpNode).appendTo(gWFLogXML);
    }
    gForm.WFFlowLogXML.value = parseInnerXML(gWFLogXML);
    ClearRepeat("AllUser", gUserCName);
    fnResumeDisabled();
    gForm["$$QuerySaveAgent"].value = gWQSagent;
    //页面提交后执行
    var _pe = gPageEvent["SaveAfter"];
    if (_pe.replace(/\s/, "") != "") {
        //try{eval(gPageEvent["WFSaveAfter"])}catch(e){alert("页面提交后执行的函数可能未在页面中初始化！");return}
        //try{dojo.eval(gPageEvent["SaveAfter"])}catch(e){alert("\u9875\u9762\u63D0\u4EA4\u540E\u6267\u884C\u7684\u51FD\u6570 < "+gPageEvent["OpenBefore"]+" > \u53EF\u80FD\u672A\u5728\u9875\u9762\u4E2D\u521D\u59CB\u5316\uFF01");}
        try {
            var _f = eval(_pe);
            if (typeof _f != "undefined") {
                if (!_f) {
                    return
                }
            }
        } catch(e) {
            alert("\u9875\u9762\u63D0\u4EA4\u524D\u6267\u884C\u7684\u51FD\u6570 < " + _pe + " > \u53EF\u80FD\u672A\u5728\u9875\u9762\u4E2D\u521D\u59CB\u5316\uFF01");
        }
    }
    /*通知方式*/
    if (bGo2Next) {
        var strWFRouterID = gForm.WFRouterID.value,
        arrID = $.trim(strWFRouterID) == "" ? [] : strWFRouterID.split(";");
        if (arrID.length > 0) {
            var objCurNode = $(arrID[arrID.length - 1], gWFProcessXML);
            if (objCurNode.length > 0) {
                /*
				if(getNodeValue(objCurNode[0],"WFMailEnabled")=="\u662F"){
				if(getNodeValue(objCurNode[0],"WFAllObject")=="\u662F"){

				}else{
				//wfFormula(arrItems);
				}
				}
				 */
                try {
                    //if(getNodeValue(objCurNode[0],"WFRtxEnabled")=="是"){
                    if (getNodeValue(objCurNode[0], "WFRtxEnabled") == "\u662F") {
                        //var cgi="SendNotify_"+(document.charset=="utf-8"?"UTF8":"GB"),
                        //var cgi="SendNotify",link=location.protocol+"//"+location.host+"/"+gCurDB+"/vwComOpenDoc/"+gDocKey+".?OpenDocument",msg=wfMsgContent(getNodeValue(objCurNode[0],"WFRtxContent"));
                        //var link=location.protocol+"//"+location.host+"/"+gCurDB+"/vwComOpenDoc/"+gDocKey+".?OpenDocument",msg=wfMsgContent(getNodeValue(objCurNode[0],"WFRtxContent"));
                        var link = "/" + gCurDB + "/vwComOpenDoc/" + gDocKey + ".?OpenDocument",
                        msg = wfMsgContent(getNodeValue(objCurNode[0], "WFRtxContent"));
                        //urlpath="http://"+gNoticeConfig.RTXIP+":"+gNoticeConfig.RTXPort+"/"+cgi+".cgi?msg=["+msg+"|"+link+"]";
                        /*
						require(["dojo/io/script"],function($){
						var user="";

						if(getNodeValue(objCurNode[0],"WFAllObject")=="\u662F"){
						user="all";
						}else if(getNodeValue(objCurNode[0],"WFAllReadUsers")=="\u662F"){
						user=gForm.AllUser.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
						}else if(getNodeValue(objCurNode[0],"WFOnlyInitiator")=="\u662F"){
						user=gForm.WFOnlyInitiator.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
						}else{
						user=gForm.CurUser.value.split(";").join(",");
						}
						if(getNodeValue(objCurNode[0],"WFAllObject")=="\u662F"){
						user="all";
						}else if(getNodeValue(objCurNode[0],"WFAllReadUsers")=="\u662F"){
						user=fnGetRTX(gForm.AllUser.value.split(";").concat(gForm.CurUser.value.split(";")).join("|"));
						}else if(getNodeValue(objCurNode[0],"WFOnlyInitiator")=="\u662F"){
						user=fnGetRTX(gForm.WFInitiator.value.split(";").concat(gForm.CurUser.value.split(";")).join("|"));
						}else{
						user=fnGetRTX(gForm.CurUser.value.split(";").join("|"));
						}
						if(user.replace(/\s/g,"")!=""){
						$.get({
						url:encodeURI(urlpath+"&receiver="+user+"&callback=?"),
						callbackParamName:"callback",
						load:function(data){gForm.submit()},
						error:function(err){},
						timeout:2000
						});
						return
						}
						})

						var user="",rtxurl="";

						if(getNodeValue(objCurNode[0],"WFAllObject")=="\u662F"){
						user="all";
						}else if(getNodeValue(objCurNode[0],"WFAllReadUsers")=="\u662F"){
						user=gForm.AllUser.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
						}else if(getNodeValue(objCurNode[0],"WFOnlyInitiator")=="\u662F"){
						user=gForm.WFOnlyInitiator.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
						}else{
						user=gForm.CurUser.value.split(";").join(",");
						}
						if(getNodeValue(objCurNode[0],"WFAllObject")=="\u662F"){
						user="all";
						}else if(getNodeValue(objCurNode[0],"WFAllReadUsers")=="\u662F"){
						user=fnGetRTX(gForm.AllUser.value.split(";").concat(gForm.CurUser.value.split(";")).join("|"));
						}else if(getNodeValue(objCurNode[0],"WFOnlyInitiator")=="\u662F"){
						user=fnGetRTX(gForm.WFInitiator.value.split(";").concat(gForm.CurUser.value.split(";")).join("|"));
						}else{
						user=fnGetRTX(gForm.CurUser.value.split(";").join("|"));
						}
						rtxurl=(urlpath+"&receiver="+user);
						window.open(rtxurl,"_blank","height=50,width=50,top=0,left=0,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no");
						 */
                        //var user="",args="&Link="+link+"&Msg="+msg+"&IP="+gNoticeConfig.RTXIP+"&Port="+gNoticeConfig.RTXPort;
                        var strMo = "";
                        if (gForm.WFModule) {
                            strMo = gForm.WFModule.value
                        }
                        var user = "",
                        args = "&L=" + link + "&M=" + msg + "&T=" + strMo;
                        //alert(msg);
                        if (getNodeValue(objCurNode[0], "WFAllObject") == "\u662F") {
                            user = "all";
                        } else if (getNodeValue(objCurNode[0], "WFAllReadUsers") == "\u662F") {
                            user = gForm.AllUser.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
                        } else if (getNodeValue(objCurNode[0], "WFOnlyInitiator") == "\u662F") {
                            user = gForm.WFOnlyInitiator.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
                        } else {
                            user = gForm.CurUser.value.split(";").join(",");
                        }
                        args += "&U=" + user;
                        $.ajax({
                            url: encodeURI("/" + gCommonDB + "/(agtWFRTX)?OpenAgent" + args),
                            cache: false,
                            async: false,
                            success: function(txt) {
                                //strU=txt;
                            }
                        });
                    }
                } catch(e) {}
                /*
				if(getNodeValue(objCurNode[0],"WFPhoneEnabled")=="是"){

				}
				 */
            }
        }
    }
    gForm.submit()
}
/*
function fnGetRTX(U){
处理自定义公式
var strU="";
var args="&U="+U;
dojo.xhrGet({url:encodeURI("/"+gCommonDB+"/(agtWFRTX)?OpenAgent"+args),preventCache:true,sync:true,load:function(txt){
strU=txt;
}});
return strU;
}
 */
function wfMsgContent(content) {
    var strContent = $.trim(content);
    if (strContent != "") {
        /*
		var regexp = /\{.*?}/gi;
		var rs,tmp;
		while ((rs = regexp.exec(strContent)) != null){
		tmp=new String(rs).substr(1).slice(0,-1);
		if(typeof gForm[tmp]!="undefined"){
		strContent=strContent.replace(new String(rs),gForm[tmp].value)
		}else{
		strContent=strContent.replace(new String(rs),"")
		}

		//document.write(rs);
		//document.write(regexp.lastIndex);
		//document.write("<br />");
		}
		 */
        //*
        var arrItem = (strContent.match(/\{.*?}/ig));
        $.each(arrItem,
        function(i, item) {
            tmp = item;
            item = item.substr(1).slice(0, -1);
            if (typeof gForm[item] != "undefined") {
                strContent = strContent.replace(tmp, gForm[item].value)
            } else {
                strContent = strContent.replace(tmp, "")
            }

        });
        //*/
    }
    return strContent == "" ? "-*-": strContent;
}
function wfFormula(arrItems, IsWeb) {
    /*处理自定义公式*/
    var arrP = [];
    if (arrItems.length > 0) {
        var arrF = [],
        arrT = [];
        $.each(arrItems,
        function(i, item) {
            if (item.indexOf("^P") > 0) {
                arrP.push(item.split("^")[0]);
            } else if (item.indexOf("^F") > 0) {
                arrF.push(item.split("^")[0]);
            } else {
                arrP.push(item);
            }
        });
        if (arrF.length > 0) {
            var args = "&W=" + IsWeb + "&I=" + gInitiator + "&CU=" + gUserCName + "&TDB=" + gCurDBName + "&ID=" + gCurDocID + "&IS=" + gIsNewDoc + "&F=" + arrF.join("|");
			$.ajax({
                url: encodeURI("/" + gFormulaDB + "/(agtWFFormula)?OpenAgent" + args),
                cache: false,
                async: false,
                dataType: "text",
                success: function(txt) {
                    txt = txt.replace(/\s/g, "");
                    if (txt != "") {
                        if (IsWeb == "") {
                            arrT = txt.split("^");
                        } else {
                            //看是否网页有此函数(等待扩展)
                            $.each(txt.split("^"),
                            function(i, item) {
                                try {
                                    _tmp = eval("("+item+")");
                                    if ($.type(_tmp) == "array") {
                                        arrT = arrT.concat(_tmp);
                                    } else {
                                        //alert("网页公式返回值非数组，请联系开发人员进行调整！");
                                        alert("\u7F51\u9875\u516C\u5F0F\u8FD4\u56DE\u503C\u975E\u6570\u7EC4\uFF0C\u8BF7\u8054\u7CFB\u5F00\u53D1\u4EBA\u5458\u8FDB\u884C\u8C03\u6574\uFF01");
                                        return;
                                    }
                                } catch(e) { alert(e.name + ": " + e.message)}
                            });
                        }
                    }
                }
            });
        }
        if (arrT.length > 0) {
            arrP = arrP.concat(arrT);
        }
    }
    return arrP;
}

//返回列宽度
function returnCellWidth(c){
	var f = eval("({" + c.attributes["columns"].value + "})");
	var d=[];
	for (var b in f) {
		d.push(f[b]);
	}
	return d;
}


function goAppendComLang(val) {
    if (val.replace(/\s/g, "") != "") {
        var tmp = document.getElementById("WFIdea");
        //if(tmp.value==""){tmp.value=val}else{tmp.value=tmp.value+"\n"+val}
        tmp.value = val
    }
}
function goLookWorkFlow() {
    if (window != top) {
        top.goWorkFlow(gCurDBName, gCurDocID, false);
    } else {
        var linkType = "height=580,width=880,top=50,left=200,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no";
        var link = "/" + gWorkFlowDB + "/htmWFViewWindow?ReadForm&db=" + gCurDBName + "&id=" + gCurDocID + "&cu=" + encodeURI(gForm.CurUser.value) + "&status=" + gWFStatus + "&gWFTacheName=" + encodeURI(gForm.WFTacheName.value);
        window.open(link, "newwindow", linkType);
    }
}
function wfSign(obj) {
    $("#WFSign").css("display", "inline");
    //dojo.byId("WFSign").innerHTML=gUserCName+"\u3000"+gServerTime;
    document.getElementById("WFSign").innerHTML = gUserCName + "　" + gServerTime;
    $(obj).css("display", "none");
}
function wfStop() {
    //确定要做相应操作吗？
    if (!gIsNewDoc) {
        if (confirm("\u786E\u5B9A\u8981\u505A\u76F8\u5E94\u64CD\u4F5C\u5417\uFF1F")) {
            //if(confirm("确定要做相应操作吗？")){
            $.ajax({
                url: encodeURI("/" + gCommonDB + "/agtWFStop?OpenAgent&DocID=" + gCurDocID + "&TDB=" + gCurDBName + "&User=" + gUserCName),
                dataType: "text",
                success: function(txt) {
                    var intM = parseInt(txt, 10);
                    if (intM == 0) {
                        alert("\u53EF\u80FD\u7CFB\u7EDF\u6709\u5F02\u5E38\uFF0C\u672A\u6210\u529F\u7EC8\u6B62\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\uFF01")
                        //alert("可能系统有异常，未成功终止，请联系管理员！")
                    } else if (intM == 1) {
                        alert("\u5DF2\u6210\u529F\u7EC8\u6B62\uFF01");
                        //alert("已成功终止！");
                        window.location.reload()
                    } else if (intM == 2) {
                        alert("\u6587\u6863\u6B64\u65F6\u6B63\u5728\u88AB\u4ED6\u4EBA\u5904\u7406\uFF0C\u4E0D\u80FD\u88AB\u7EC8\u6B62\uFF01")
                        //alert("文档此时正在被他人处理，不能被终止！")
                    } else if (intM == 3) {
                        alert("\u6D41\u7A0B\u5DF2\u7ECF\u88AB\u7EC8\u6B62\u6216\u7ED3\u675F\uFF0C\u4E0D\u80FD\u88AB\u53D6\u56DE\uFF01")
                        //alert("流程已经被终止或结束，不能被取回！")
                    } else {
                        alert("\u60A8\u4E0D\u662F\u6587\u6863\u7684\u63D0\u4EA4\u8005\uFF0C\u4E0D\u80FD\u88AB\u7EC8\u6B62\uFF01")
                        //alert("您不是文档的提交者，不能被终止！")
                    }
                }
            })
        }
    } else {
        alert("\u60A8\u597D\uFF0C\u8349\u7A3F\u72B6\u6001\u65F6\uFF0C\u6B64\u64CD\u4F5C\u65E0\u6548\uFF01")
    }
    //您好，草稿状态时，此操作无效！
}
function wfAddToolbar(id) {
    var arrBtns = [
    //{name:"\u6DFB\u52A0\u4EBA\u5458",title:"\u6DFB\u52A0\u4EBA\u5458",ico:"",clickEvent:"wfSelectUser()",align:"1",isHidden:"0"},
    //{name:"\u79FB\u9664\u4EBA\u5458",title:"\u79FB\u9664\u4EBA\u5458",ico:"",clickEvent:"wfClearUser()",align:"1",isHidden:"0"},
	{
        name: "\u67e5\u8be2",//查询
        title: "\u67e5\u8be2",
        ico: "icon-search",
        clickEvent: "wfOrgSearch()",
        align: "2",
        isHidden: "1",
		id:"wfS"
    },
	{
        name: "\u5237\u65b0",//刷新
        title: "\u5237\u65b0",
        ico: "icon-reload",
        clickEvent: "wfOrgSearch(true)",
        align: "2",
        isHidden: "1",
		id:"wfRe"
    },
    {
        name: "\u786E\u5B9A",
        title: "\u786E\u5B9A\u5E76\u63D0\u4EA4",
        ico: "icon-ok",
        clickEvent: "wfDlgBtnSave()",
        align: "2",
        isHidden: "0"
    },
    {
        name: "\u5173\u95ED",
        title: "\u5173\u95ED",
        ico: "icon-cancel",
        clickEvent: "mini.get(\'" + id + "\').destroy();gForm.WFStatus.value=gWFStatus;gForm.WFTacheName.value='';",
        align: "2",
        isHidden: "0"
    }];
	$("<input type='text' class='mini-textbox' id='searchValue' visible=false />").appendTo("#SubmitDocActionBar");
    var btnHtml = "";
    for (var i = 0; i < arrBtns.length; i++) {
        btnHtml = "<a class='mini-button' id='"+(arrBtns[i].id?arrBtns[i].id:"")+"' plain=true visible="+(arrBtns[i].isHidden=="1"?false:true)+" iconCls='" + arrBtns[i].ico + "'>" + arrBtns[i].name + "</a>";
        $(btnHtml).appendTo("#SubmitDocActionBar").attr('onClick', arrBtns[i].clickEvent);
    }
    mini.parse();
    wfAddTacheName();
}
function wfOrgSearch(r) {
	var tree=mini.get("orgTree");
	var key = mini.get("searchValue");
	if (key.getValue() == "" || r) {
		tree.clearFilter();
		tree.collapseAll();
		key.setValue("");
	} else {
		key = key.getValue().toLowerCase();
		tree.filter(function (node) {
			var text = node.name? node.name.toLowerCase() : "";
			if (text.indexOf(key) != -1) {
				return true;
			}
		});
		tree.expandAll();
	}
}
function changTab(e){//选择组织机构切换面板时控制查询按钮功能
	if(!(mini.get("wfS")&&mini.get("wfRe"))){
		return;
	}
	if(e.tab.title=="\u7ec4\u7ec7\u673a\u6784"){//组织机构
		mini.get("wfS").set({visible:true});
		mini.get("wfRe").set({visible:true});
		mini.get("searchValue").set({visible:true});
		return;
	}
	mini.get("wfS").set({visible:false});
	mini.get("wfRe").set({visible:false});
	mini.get("searchValue").set({visible:false});
}
function parseInnerXML(node) {
    if (node.innerXML) {
        return node.innerXML;
    } else if (node.xml) {
        return node.xml;
    } else if (typeof XMLSerializer != "undefined") {
        return (new XMLSerializer()).serializeToString(node);
    }
    return null;
}
function loadOrgTree() {
    var tree = mini.get("orgTree");
    $.ajax({
        url: encodeURI("/" + gOrgDB + "/vwPersonTreeJson?OpenView&Count=9999&ExpandAll"),
        cache: false,
        async: false,
        success: function(MenuText) {
            if (MenuText.indexOf(",") > -1) {
                tree.loadList(eval("[" + MenuText.substr(1) + "]"), "id", "pid");
            }
        }
    });
}
function treeNodeClick(e) {
    if (e.node.isdept != "1") {
        AddValue(e.node.name, "selectList");
    }
}
function listNodeClick(e) {
    AddValue(e.sender.getSelected().name, "selectList");
}

function getBtnName(name){
	var btnField="";
	if(name=="保存"){
		btnField="FlowSave";
	}
	if(name=="提交"){
		btnField="FlowSubmit";
	}
	if(name=="拒绝"){
		btnField="FlowRefuse";
	}
	if(name=="查看流程信息"){
		btnField="FlowInfo";
	}
	if(name=="返回"){
		btnField="FlowReturn";
	}
	if(name=="关闭"){
		btnField="Close";
	}
	if(name=="删除"){
		btnField="DelFile";
	}
	if(name=="上传" || name=="上传附件"){
		btnField="UpFile";
	}
	if(btnField!=""){
		return PublicField[btnField];
	}
	return name
}

function getClsName(name){
	var btnCls="";
	if(name=="保存"){
		btnCls="greyishB";
	}
	if(name=="提交"){
		btnCls="blueB";
	}
	if(name=="拒绝"){
		btnCls="redB";
	}
	if(name=="查看流程信息"){
		btnCls="greenB";
	}
	if(name=="返回"){
		btnCls="basic";
	}
	if(name=="关闭"){
		btnCls="basic";
	}
	if(name=="删除"){
		btnCls="redB";
	}
	if(btnCls==""){
		btnCls="basic";
	}
	return btnCls
}
