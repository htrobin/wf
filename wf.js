var gWFProcessXML = null, 					//流程处理XML对象，用于流程提交处理
gCurNode = null,							//当前流程环节点对象
gArrTacheName = null,						//存储与当前节点有关联的所有目标流程环节名称
gWFLogXML = null,							//流程日志XML对象，用于流程流转日志及意见的显示
gJsonField = null,							//存储当前流程环节节点的所有域的状态JSON对象
gIdeaID = [],								//存储所有意见ID标识
gWQSagent = "(wqsWFSubmitDoc)",				//流程处理后，后台服务器需要处理的代理名称
gArrLogUser = [],							//所有已处理过的用户
gAction = WF_CONST_LANG.USE_ACTION,			//当前用户操作动作，->"存储目标环节点人员"
gPageEvent = {
    "OpenBefore": "",						//页面Dom装载后，流程过程处理前行为
    "OpenAfter": "",						//页面Dom装载后，流程过程处理后行为
    "SaveBefore": "",						//流程保存或提交前行为
    "SaveAfter": ""							//流程处理后保存表单前行为
};
//页面Dom解析后执行
$(function() {
    if (gIsNewDoc && gWFID == "") {
        //@V6.1 * 调整为多语言 (2015-09-18)
        alert(WF_CONST_LANG.NO_USE_WORKFLOW+"\n\n"+WF_CONST_LANG.CONTACT_ADMIN);
    } else {
		log("----页面装载开始----");
        var tmpCurUser = gForm.CurUser.value.replace(/\s/g, ""),
        arrTmpCurUser = tmpCurUser.indexOf(",") > -1 ? tmpCurUser.split(",") : tmpCurUser.split(";");
		log("当前流程处理人员: ",tmpCurUser);
        //读取流程图
        var strView = "vwWFXML";
        if (gWFDebug) {
            strView = "vwWFDebug";
		}
		var strPath = "/" + gWorkFlowDB + "/" + strView + "/" + gWFID + ".?OpenDocument";
		//不是新文档时，传递当前文档ID号，用于读取当前文档的流程日志
        if (!gIsNewDoc) {
            strPath += "&id="+gCurDocID;
		}
		log("流程路径: "+strPath);
        $.ajax({
            url: strPath,
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
/*
//根据流程规则，初始化表单相关属性及事件
@arrTmpCurUser 当前流程处理人员
*/
function initOnLoad(arrTmpCurUser) {
    //页面装载前执行全局方法
	if(typeof beforeLoad != "undefined"){
		beforeLoad()
	}
    //编辑状态下执行
    $.each($('textarea[name^="ID_"]', gForm),
    function(i, item) {
        $("<div></div>").insertBefore(item).attr("id", $(item).attr("name"));
        if (!gIsEditDoc) {
            $(item).remove()
        }
    });
    if (gIsEditDoc) {
		log("$进入可编辑模式$");
        var strCurID = gIsNewDoc ? (gWFProcessXML.getAttribute("OriginNode")) : gForm.WFCurNodeID.value;
        gCurNode = $(strCurID, gWFProcessXML);
        if (gIsNewDoc) {
            gWFLogXML.setAttribute("OriginRouter", gWFProcessXML.getAttribute("OriginRouter"));
            gForm.WFCurNodeID.value = strCurID;
            gForm.WFTacheName.value = getNodeValue(gCurNode[0], "WFNodeName");
        }
        if (gWFStatus < 2) {
            //读取初始化事件
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
            if (_pe.replace(/\s/, "") !== "") {
                try {
					//@V6.1 - 屏蔽eval功能(2015-09-16)
					new Function(_pe)();
                } catch(e) {
					//@V6.1 * 调整为多语言 (2015-09-18)
                    alert(WF_CONST_LANG.OPEN_BEFORE + " < " + _pe + " > " + WF_CONST_LANG.PAGE_NO_INIT);
                }
            }
			log("*装载按钮*");
            $.each($(gForm.WFCurNodeID.value + ">WFBtnAssign>tr", gWFProcessXML),
            function(i, item) {
                var objBtn = {};
                $.each($("td", item),
                function(idx, item) {
                    if (idx > 0) {
                        var txt = item.getAttribute("value");
                        switch (idx) {
                        case 1:
							if(typeof WF_CONST_LANG[txt]=="undefined"){WF_CONST_LANG[txt]=txt};
                            objBtn.name = WF_CONST_LANG[txt];
                            break;
                        case 2:
                            objBtn.ico = txt;
                            break;
                        case 3:
                            objBtn.clickEvent = txt;
                            break;
                        case 4:
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
            //读取当前节点字段控制清单
            $.each($(gForm.WFCurNodeID.value + ">WFFieldStatus", gWFProcessXML),
            function(i, item) {
                var strFieldStatus = item.getAttribute("value");
                if (strFieldStatus !== "") {
					//@V6.1 # 将JSON字符串中的单引号换为双引号，否则在IE下parseJSON解析时会报错误。(2015-09-16)
					strFieldStatus=strFieldStatus.replace(/\'/g,"\"");
					log("*字段控制*: ");
                    gJsonField = $.parseJSON(strFieldStatus);
                    var _getStatus = function(obj) {
                        for (o in obj) {
                            return o
                        }
                    };
                    var _setStatus = function(obj, status, f) {
                        try {
							log("　　",f," -> ",status);
                            var strTagName = obj.tagName.toLowerCase(),
                            strType = obj.type ? obj.type.toLowerCase() : "div";
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
									if (strTagName=="textarea" && f.indexOf("ID_") > -1) {
										$('[name=\"' + f + '\"]', gForm).remove()
									}else{
										$(obj).attr("enabled", false)
									}
									break;
								case "h":
									/*隐藏*/
									if (f.indexOf("js-") > -1) {
										$(obj).css("display", "none");
									} else {
										if (strTagName != "textarea") {
											$(obj).attr("visible", false)
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
											if (f.indexOf("js-") > -1) {
												$(obj).css("display", "none")
											} else {
												$(obj).attr("visible", false)
											}
										} else {
											if (f.indexOf("js-") > -1) {
												$(obj).css("display", "")
											}
										}
									}
									break;
								case "w":
									/*必填*/
									if (f.indexOf("ID_") > -1) {
										gIdeaID.push(f)
										/*存储意见的ID*/
									}
									$(obj).attr("required", true);
									break;
								case "m":
									/*仅部分可见必填*/
									var tmp = gJsonField[f].m.split("$$");
									if (_arrSeeUser == null) {
										_arrSeeUser = wfFormula(tmp[0].split("|"), "")
									}

									if ($.inArray(gUserCName, _arrSeeUser) < 0) {
										if (f.indexOf("js-") > -1) {
											$(obj).css("display", "none")
										} else {
											$(obj).attr("visible", false)
										}
									} else {
										if (f.indexOf("js-") > -1) {
											$(obj).css("display", "")
										}
										if (f.indexOf("ID_") > -1) {
											gIdeaID.push(f)
											/*存储意见的ID*/
										}
										$(obj).attr("required", true);
										break;
									}
									break;
								default:
                            }
                        } catch(e) {
                            log("字段设置状态错误")
                        }
                    };
                    var _tmpField = [];
					
                    for (f in gJsonField) {
                        var status = _getStatus(gJsonField[f]),
                        type = "name",
                        _arrSeeUser = null;
                        if (f.indexOf("js-") > -1) {
                            var arrF = $("." + f, gForm)
                        } else {
                            var arrF = $('[' + type + '=\"' + f + '\"]', gForm)
                        }
                        if (arrF.length == 0) {
                            _tmpField.push(f)
                        }
                        /*检测不到域的标识*/
                        $.each(arrF,
                        function(i, item) {
                            _setStatus(item, status, f)
                        })
                    }

                    if (_tmpField.length > 0) {
						//@V6.1 * 调整为多语言 (2015-09-18)
                        alert(WF_CONST_LANG.NO_CHECK_FIELD+"\n" + _tmpField.join("\n"))
                    }
                }
            });
            //装载后执行函数
            var _pe = gPageEvent["OpenAfter"];
            if (_pe.replace(/\s/, "") != "") {
                try {
					//@V6.1 * 屏蔽eval功能(2015-09-16)
					new Function(_pe)();
                } catch(e) {
					//@V6.1 * 调整为多语言 (2015-09-18)
                    alert(WF_CONST_LANG.OPEN_AFTER + " < " + _pe + " > " + WF_CONST_LANG.PAGE_NO_INIT);
                }
            }
        }
    }
	else 
	{
		log("$进入只读模式$");
		 //装载附件表格
		//loadAttachGrid(true);
        var _TEST = function(ID) {
            $.each($(ID + ">WFFieldStatus", gWFProcessXML),
            function(i, item) {
                var strFieldStatus = item.getAttribute("value");
                if (strFieldStatus !== "") {
					strFieldStatus=strFieldStatus.replace(/'/g,"\"");
                    gJsonField = $.parseJSON(strFieldStatus);
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
											$(obj).css("display", "none");
										} else {
											$(obj).css("display", "");
										}
									}
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
                                _setStatus(item, status, f);
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
	gJsonField=null;
	
    if (gCloseBtn.length > 0) {
        gArrBtns = gArrBtns.concat(gCloseBtn)
    }
	var btndom = '<button class="btn btn-md" type="button"></button>';
    $("#btnCont").empty();
	
	/* 是否汉字 */
	var isChinese=function(v) {
		var re = new RegExp("^[\u4e00-\u9fa5]+$");
		if (re.test(v)) return true;
		return false;
	};
	log("*开始生成按钮*");
    $.each($.grep(gArrBtns,function(item){return item.isHidden != "1"}),
    function(i, e) {
        var gBtn=$(e.align == "1" ? $(btndom).appendTo("#btnContL") : $(btndom).appendTo("#btnContR"))
		.html(isChinese(e.name)?e.name.split("").join("&nbsp;&nbsp;"):e.name)
		.addClass(e.ico)
		.attr({
            onClick: e.clickEvent,
            style: "margin:0px 7px 15px 7px"
        });
		log("　　按钮"+i+": "+e.name+"|"+e.ico+"|"+e.clickEvent);
    });
	log("*结束生成按钮*");
	//替换回miniui的固定样式声明
	$("[class^='miniui-']").attr("class",function(){
		return this.className.replace(/miniui-/g,"mini-")
	});
	log("*转换为MINIUI元素,并渲染*");
    mini.parse();
    
    if (!gIsNewDoc) {
        //生成意见
        if (gWFLogXML.childNodes) {
			log("*开始生成意见*");
            var sTacheNum = 1, DataPrefix = "", DataSuffix = "", strId = "", WFIdeaPrefix = "", WFIdeaSuffix = "";
            $.each(gWFLogXML.childNodes,
            function(i, item) {
				log(XML2String(item));
				if(typeof(unionIdea)=="undefined" || !unionIdea){
					strId = item.getAttribute("id") ? $.trim(item.getAttribute("id")) : "";
					if (strId.indexOf("ID_") > -1) {
						var _time = item.getAttribute("time"),
						_tdID = "td" + strId + sTacheNum,
						_idea = DecodeHtml(item.getAttribute("idea")),
						_mark = item.getAttribute("mark");
						WFIdeaPrefix = '<table cellspacing=1 cellpadding=1 id="showWFIdea"><tr><td class="tdIdea" id="' + _tdID + '" ' + (_mark != 'undefined' && _mark == '1' ? 'style="color:red;font-weight:bold"': '') + '>&nbsp;</td></tr>';
						WFIdeaSuffix = '<tr><td class="tdIdeaUser" title="'+WF_CONST_LANG.SPECIFIC_TIME + _time + '">' + item.getAttribute("user").replace(/[0-9]/g, "") + '&nbsp;&nbsp;<span>' + _time + '</span></td></tr></table>'; //具体时间：
						$("#" + strId).append("<div>" + WFIdeaPrefix + WFIdeaSuffix + "</div>");
						$("td#" + _tdID).empty().append(_idea);
					}
				}else{
					if(typeof(document.getElementById("ideaArea"))=="undefined"){
						alert(WF_CONST_LANG.IDEA_AREA_UNDEFINDED); //意见显示区域未定义
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
								_idea = DecodeHtml(item.getAttribute("idea"))==""?"\u9605\u3002":DecodeHtml(item.getAttribute("idea")), //如果意见为空则显示"阅。"
								_mark = item.getAttribute("mark");
							WFIdeaPrefix = '<table cellspacing=1 cellpadding=1 id="showWFIdea" style="width:100%"><tr><td class="techename" style="width:150px;text-align:center">'+_tache+'</td><td class="tdIdea" id="' + _tdID + '" ' + (_mark != 'undefined' && _mark == '1' ? 'style="color:red;font-weight:bold;"': '') + '>&nbsp;</td>';
							WFIdeaSuffix = '<td class="tdIdeaUser" style="width:250px;text-align:left" title="'+WF_CONST_LANG.SPECIFIC_TIME + _time + '"><span style="width:100px;float:left;text-align:center">' + item.getAttribute("user").replace(/[0-9]/g, "") + '</span><span style="float:left">' + _time + '</span></td></tr></table>';
							$("#" + strId).append("<div onmousemove='this.style.backgroundColor=\"#e1dfdf\"' onmouseout='this.style.backgroundColor=\"#fff\"'>" + WFIdeaPrefix + WFIdeaSuffix + "</div>");
							$("td#" + _tdID).empty().append(_idea);
						}
					}
				}
                sTacheNum++;
            });
			log("*结束生成意见*");
        }
    }
	//页面装载后执行全局方法
	if(typeof(afterLoad)!="undefined"){
		afterLoad();
	}
	log("----页面装载完毕----");
	log("");
}
//获取XML节点属性的值
function getNodeValue(node, name) {
    var reValue = "";
    $.each($(name, node),
    function(i, item) {
        reValue = item.getAttribute("value").replace(/@line@/g, "")
    });
    return $.trim(reValue);
}

function fnResumeDisabled() {
	//恢复部分域的失效状态，以保证“文档保存”时值不会变为空
	$("input[disabled],textarea[disabled],select[disabled]").prop("disabled",false);
}
function wfSubDocStart() {
	log("");
	log("----页面提交开始----");
	var isLock=false;
	var lastPerson="";//最后一次保存人
	try{
		if(!gIsNewDoc){
			log("*检测文档冲突*");
			$.ajax({
				url:'/'+gCommonDB+"/(agtGetSubTime)?OpenAgent&id="+gCurDocID+"&db="+gCurDBName,
				cache: false,
				dataType: 'text',
				async: false,
				success:function(txt){
					var _tmp=$.trim(txt);
					if(_tmp!=""){
						var arrTxt=_tmp.split("^");
						if(mini.formatDate(mini.parseDate(arrTxt[0]),"yyyy-MM-dd HH:mm:ss")!=mini.formatDate(mini.parseDate(gSubTime),"yyyy-MM-dd HH:mm:ss")){
							isLock=true;
							lastPerson=arrTxt[1];
						}
						
						log("前端处理时间: ",mini.formatDate(mini.parseDate(gSubTime),"yyyy-MM-dd HH:mm:ss"));
						log("后端处理时间: ",mini.parseDate(arrTxt[0]),"yyyy-MM-dd HH:mm:ss");
					}
				}
			});
		}
	}catch(e){
		isLock=false
	}
	if(isLock){
		//在您提交前[xxx]已经对文件进行了提交操作，请您刷新页面重新提交.
		alert(WF_CONST_LANG.LOCK_SUBMIT_PREFIX+lastPerson+WF_CONST_LANG.LOCK_SUBMIT_SUFFIX);
		return;
	}
	
	//用于页面验证
	var tmpform = new mini.Form(gForm);
	tmpform.validate();
	if (tmpform.isValid() == false){
		log("*表单验证失败,终止提交*");
		return;
	}
	
	log("当前节点ID(WFCurNodeID): ",gForm.WFCurNodeID.value);
    var objCurNode = $(gForm.WFCurNodeID.value, gWFProcessXML);
    var isWFOrg = getNodeValue(objCurNode[0], "WFWithOrg")===""?0:1;
	
	log("是否启用组织机构: ",isWFOrg);
    if (arguments.length == 1) {
        gWQSagent = arguments[0];
    }
    //页面提交前执行
    var _pe = gPageEvent["SaveBefore"];
    if (_pe.replace(/\s/, "") != "") {
        try {
			//@V6.1 *屏蔽eval功能(2015-09-16)
			new Function(_pe)();
        } catch(e) {
            alert(WF_CONST_LANG.SAVE_BEFORE + "< " + _pe + " > "+WF_CONST_LANG.PAGE_NO_INIT);
        }
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
			log("审批方式: ",strAppoveStyle," ","审批人数: ",tmpGetValue," ","是否顺序审批: ",strSequenceApprove);
            if (tmpGetValue != "") {
                intApproveNum = parseInt(tmpGetValue, 10)
            }
            if (strAppoveStyle == WF_CONST_LANG.MUTIL_PERSON) { //多人
                var arrFinishUser = [],
                strWF = gForm.WFFinishApproval.value.replace(/\s/g, ""),
                bGo2Next = true;
                if (strWF != "") {
					log("已处理完人员: ",strWF);
                    arrFinishUser = strWF.split(";")
                };
                if ($.grep(arrFinishUser,
                function(item) {
                    return $.trim(item) == gUserCName
                }).length == 0) {
                    arrFinishUser.push(gUserCName)
                }
                gForm.WFFinishApproval.value = arrFinishUser.join(";");
                if (strSequenceApprove == WF_CONST_LANG.YES) { //是
					log("*顺序审批*");
                    /*
					如果是所人审批情况：最好能逐一添加人员进行处理，当第二个人以后审批时，通知方式可以读取与当前节点相关的路由
					如果当前审批人是领导，有相关的督办人员，督办人员可督促，可协办处理。这种情况时，CurUser存放2个人，一个是领导人，一个是督办人。(待开发)
					 */
                    if ($.trim(gForm.WFWaitApproval.value) == "") {
                        gForm.WFWaitApproval.value = "";
						log("多人审批已经处理完毕");
                        bGo2Next = false;
                    } else {
                        var arrWaitUsers = gForm.WFWaitApproval.value.replace(/\s/g, "").split(";");
						log("多人审批->原先所有等待处理人: ",gForm.WFWaitApproval.value);
                        gForm.CurUser.value = arrWaitUsers[0];
						log("多人审批->待处理人: ",gForm.CurUser.value);
                        gForm.WFWaitApproval.value = arrWaitUsers.slice(1).join(";");
						log("多人审批->将要待处理人: ",gForm.WFWaitApproval.value);
                    }
                } else {
					log("*随机审批*");
                    var strUser = gForm.CurUser.value.replace(/\s/g, "");
                    //"文档不能进行流转！\n\n当前审批人不应为空，请联系管理员！"
                    if (strUser == "") {
                        alert(WF_CONST_LANG.DOCUMENT_NOT_SUBMIT);
                        return
                    }
					log("多人审批->原先所有待处理人: ",gForm.CurUser.value);
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
					log("多人审批->待处理人: ",gForm.CurUser.value);
                }
				log("是否多人审批已处理完毕: ",bGo2Next?"YES":"NO");
                if (bGo2Next) {
                    var bWFAgreeMark = 0;
                    $('[source="' + gForm.WFCurNodeID.value + '"]', gWFProcessXML).each(function(i, item) {
                        if (getNodeValue(item, "WFAgreeMark") == WF_CONST_LANG.YES) {
                            bWFAgreeMark = 1
                        }
                    });
                    //CONFIRM_SUBMIT:您确定提交吗？
                    if (confirm(WF_CONST_LANG.CONFIRM_SUBMIT)) {
                        wfSubDocEndSave(false, bWFAgreeMark)
                    } else {
                        gForm.WFStatus.value = gWFStatus
                    }
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
		log("路由分支: ",1," 条");
        //一个路由线时，连接类型只能是唯一或直连
        //直连时，不需要弹出框，直接提交给下一环节已经定义好的审批人。
        //唯一选择时，需要弹出框，提交给所选择的人。
        //注：下一环节点为结束节点时，是特殊情况，需加注意。
        var vRelationType = getNodeValue(arrEdges[0], "WFRelationType");
		log("路由类型: ",vRelationType);
        if (vRelationType != "") {
            //WORKFLOW_END:流程结束
            var tarID = arrEdges[0].getAttribute("target"),strTacheName = WF_CONST_LANG.WORKFLOW_END;

            ClearRepeat("WFRouterID", arrEdges[0].nodeName); //增加路由线
			//DIRECT:直连
            if (vRelationType == WF_CONST_LANG.DIRECT) {
                if (!confirm(WF_CONST_LANG.CONFIRM_SUBMIT)) {
                    gForm.WFStatus.value = gWFStatus;
                    return
                }
				/*结束节点*/
                if (tarID.indexOf("E") > -1) {
					log("直连 --> 流程结束");
                    gForm.WFStatus.value = 2;
                    wfSubDocEnd("", [], strTacheName);
                    return
                }
                var nxtNode = $(tarID, gWFProcessXML);
                if (nxtNode.length == 1) {
					strTacheName = getNodeValue(nxtNode[0], "WFNodeName");
					tmpValue = getNodeValue(nxtNode[0], "WFActivityOwner");
					strAppoveStyle = getNodeValue(nxtNode[0], "WFApproveStyle");
					var strFormula = getNodeValue(nxtNode[0], "WFFormula");
					log("环节名称: ",strTacheName);
					log("环节处理人: ",tmpValue);
					log("环节审批类型: ",strAppoveStyle);
					log("是否网页公式: ",strFormula);
					if (tmpValue != "") {
						gArrLogUser = wfFormula(tmpValue.split("|"), strFormula);
						log("直连",gArrLogUser);
						if (gArrLogUser.length == 1) {
							wfSubDocEnd(tarID, gArrLogUser, strTacheName)
						} else {
							//MUTIL_PERSON:多人
							if (strAppoveStyle != WF_CONST_LANG.MUTIL_PERSON) {
								alert(WF_CONST_LANG.ROUTER_RELATIION_SCENE);
							} else {
								wfSubDocEnd(tarID, gArrLogUser, strTacheName);
								return;
							}
						}
					} else {
						alert(WF_CONST_LANG.NO_FIND_NEXT_PERSON);
					}
                } else {
                    alert(WF_CONST_LANG.NEXT_NODE_NOT_EXITED);
                    return
                }
			//ONLY_SELECT:唯一选择
            } else if (vRelationType == WF_CONST_LANG.ONLY_SELECT) {
                /*结束节点*/
                if (tarID.indexOf("E") > -1) {
					log("唯一选择 --> 流程结束");
                    gForm.WFStatus.value = 2;
                    wfSubDocEnd("", [], strTacheName);
                    return
                }

                strTacheName = getNodeValue(arrEdges[0], "WFNodeDetail");
                strTacheNameSelect = getNodeValue(arrEdges[0], "WFTacheNameSelect");
                gArrTacheName.push([strTacheName, tarID + "^" + arrEdges[0].nodeName, strTacheNameSelect]);
				log("目标环节名称: ",strTacheName);
				log("是否默认选中: ",strTacheNameSelect);
				log("目标环节编号: ",arrEdges[0].nodeName);
                var oWinDlg = mini.get('oWinDlg');
                if (!oWinDlg) {
					oWinDlg=new mini.Window();
                    oWinDlg.set({
                        id: "oWinDlg",
                        title: WF_CONST_LANG.SELECT_APPROVER, //选择处理人
                        url: '',
                        allowDrag: true,
                        allowResize: false,
                        showModal: true,
                        enableDragProxy: false,
                        showFooter: true,
                        showCloseButton: true,
                        footerStyle: "padding:6px 12px;",
                        width: 510,
                        height: 460
                    });
					oWinDlg.show();
                    mini.mask({
                        el: oWinDlg.getEl(),
                        cls: 'mini-mask-loading',
                        html: WF_CONST_LANG.LIST_LOADING //列表加载中...
                    });
                    $.ajax({
                        url: '/HTCommon/HT_Common.nsf/htmWFTechSel?OpenPage&Org='+(isWFOrg?"":"1"),
                        async: true,
                        dataType: 'text',
                        success: function(e) {
                            var selOrgDom = e;
                            oWinDlg.setBody( baidu.template(selOrgDom,PublicField) );
                            oWinDlg.setFooter("<div id='SubmitDocActionBar' style='text-align:left'></div>");
                            setTimeout(function(){wfAddToolbar("oWinDlg")},10);
                            mini.unmask(oWinDlg.getEl());
                        }
                    })
                } else {
                    oWinDlg.show()
                }
            } else {
                alert(WF_CONST_LANG.ROUTER_ERROR);
                return;
            }
        }
    }
	else
	{
        /*
		多条路由情况：
		1、多条唯一线
		2、多条唯一线与条件选择或条件直连组合，注意：（只要条件直连满足其它的都无需在进行判断，直接进行提交;常用于“拒绝”、“同意”）
		3、
		 */
		log("路由分支: ",arrEdges.length," 条");
		var bWinDlg=false;
		$.each(arrEdges,function(index,edge){
            var vRelationType = getNodeValue(edge, "WFRelationType"),
            tmpValue = "",
            bReturn = true;
			log("路由类型: ",vRelationType);
			//CONDITION_DIRECT:条件直连
            if (vRelationType == WF_CONST_LANG.CONDITION_DIRECT) {
                //条件直连；此环境下，无需弹出框，该功能常用于“拒绝”、“同意”等类似情况较多。
                tmpValue = getNodeValue(edge, "WFCondition");
				log("条件公式: ",tmpValue);
                if (tmpValue != "") {
                    if (wfFormulaCompare(gForm, tmpValue)) {
						log("满足条件");
                        ClearRepeat("WFRouterID", edge.nodeName); //增加路由线
                        var tarID = edge.getAttribute("target");
                        if (tarID.indexOf("E") > -1) {
							log(vRelationType," --> 流程结束");
                            gForm.WFStatus.value = 2;
                            //"流程结束"
                            wfSubDocEnd("", [], WF_CONST_LANG.WORKFLOW_END);
                        } else {
                            var nxtNode = $(tarID, gWFProcessXML);
                            if (nxtNode.length == 1) {
                                strTacheName = getNodeValue(nxtNode[0], "WFNodeName");
								strAppoveStyle = getNodeValue(nxtNode[0], "WFApproveStyle");
                                tmpValue = getNodeValue(nxtNode[0], "WFActivityOwner");
                                var strFormula = getNodeValue(nxtNode[0], "WFFormula");
								log("环节名称: ",strTacheName);
								log("环节处理人: ",tmpValue);
								log("是否网页公式: ",strFormula);
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
									log(tarID,"环节号已有下列人员参与过处理: ",gArrLogUser);
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
                                        });
										log("重新获取人员: ",gArrLogUser);
                                    }
                                    var arrLogUser = [];
                                    $.each(gArrLogUser,
                                    function(i, item) {
                                        if ($.inArray(item, arrLogUser) < 0) {
                                            arrLogUser.push(item)
                                        }
                                    });
                                    gArrLogUser = arrLogUser;
                                    if (!(strAppoveStyle != WF_CONST_LANG.MUTIL_PERSON && gArrLogUser.length > 1)) {
                                        wfSubDocEnd(tarID, gArrLogUser, strTacheName);
                                    } else {
										log("审批方式为: 单人,但有多位处理人,故需弹出选择其一. ",gArrLogUser);
                                        var oCheckUserDlg = new mini.Window();
										oCheckUserDlg.set({
                                            id: "oCheckUserDlg",
                                            title: WF_CONST_LANG.SELECT_APPROVER,
                                            //选择处理人
                                            allowDrag: true,
                                            allowResize: false,
                                            showModal: true,
                                            enableDragProxy: false,
                                            showFooter: true,
                                            footerStyle: "padding:6px 12px;",
                                            showCloseButton: true,
                                            width: 510,
                                            height: 460
                                        });
										oCheckUserDlg.show();
                                        mini.mask({
                                            el: oCheckUserDlg.getEl(),
                                            cls: 'mini-mask-loading',
                                            html: WF_CONST_LANG.LIST_LOADING //列表加载中...
                                        });
                                        $.ajax({
                                            url: '/HTCommon/HT_Common.nsf/htmWFTechSel?OpenPage&Back=1',
                                            async: true,
                                            dataType: 'text',
                                            success: function(e) {
                                                var selOrgDom = e;
                                                oCheckUserDlg.setBody( baidu.template(selOrgDom,PublicField) );
                                                oCheckUserDlg.setFooter("<div id='SubmitDocActionBar' style='text-align:right'></div>");
                                                var arrBtns = [{
                                                    name: WF_CONST_LANG.OK,
                                                    title: WF_CONST_LANG.OK_TITLE,
                                                    ico: "icon-ok",
                                                    clickEvent: "wfSubDocProcess('" + tarID + "','" + strTacheName + "','','empTarget')",
                                                    align: "2",
                                                    isHidden: "0"
                                                },
                                                {
                                                    name: WF_CONST_LANG.CANCEL,
                                                    title: WF_CONST_LANG.CANCEL,
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
                                    alert(WF_CONST_LANG.NO_FIND_NEXT_PERSON);
                                }
                            }
                        }
						bWinDlg=false;
                        bReturn = false;
                    }
                } else {
                    //路由条件不能为空！
                    alert(WF_CONST_LANG.ROUTER_CONDITION_BLANK);
                    bWinDlg=false;
					bReturn = false;
                }
				log("是否允许弹框: ",bWinDlg?"YES":"NO");
				log("是否阻止循环路由: ",bReturn?"NO":"YES");
			//DIRECT:直连
            } else if (vRelationType == WF_CONST_LANG.DIRECT) {                
                alert(WF_CONST_LANG.MUTIL_BRANCH_NOT_USE_DIRECT); //多条分支时，不允许使用“直连”。请您联系系统管理员！
                bWinDlg=false;
				bReturn = false;
            } else {
                if (vRelationType == WF_CONST_LANG.ONLY_SELECT) { //唯一选择
                    tmpValue = getNodeValue(edge, "WFNodeDetail");
					log("环节名称: ",tmpValue);
                    if (tmpValue != "") {
                        strTacheNameSelect = getNodeValue(edge, "WFTacheNameSelect");
						log("是否默认选中: ",strTacheNameSelect);
						log("目标环节编号: ",edge.nodeName);
                        gArrTacheName.push([tmpValue, edge.getAttribute("target") + "^" + edge.nodeName, strTacheNameSelect])
                    }
					bWinDlg=true; //允许弹出窗口
                } else {
                    tmpValue = getNodeValue(edge, "WFCondition");
					log("条件公式: ",tmpValue);
                    if (tmpValue != "") {
                        //条件选择时，满足条件就加入环节选择
                        if (wfFormulaCompare(gForm, tmpValue)) {
							log("*满足条件*");
                            tmpValue = getNodeValue(edge, "WFNodeDetail");
							log("环节名称: ",tmpValue);
                            if (tmpValue != "") {
                                strTacheNameSelect = getNodeValue(edge, "WFTacheNameSelect");
								log("是否默认选中: ",strTacheNameSelect);
								log("目标环节编号: ",edge.nodeName);
                                gArrTacheName.push([tmpValue, edge.getAttribute("target") + "^" + edge.nodeName, strTacheNameSelect]);
                            }
							bWinDlg=true; //允许弹出窗口
                        }
                    }
                }
				log("是否允许弹框: ",bWinDlg?"YES":"NO");
				log("是否阻止循环路由: ",bReturn?"NO":"YES");
            }
            return bReturn;
		});
		if(bWinDlg){
			log("*弹出处理人员选择框*");
            var oWinDlg = mini.get('oWinDlg');
            if (!oWinDlg) {
                oWinDlg=new mini.Window();
                oWinDlg.set({
                    id: "oWinDlg",
                    title: WF_CONST_LANG.SELECT_APPROVER,
                    url: '',
                    allowDrag: true,
                    allowResize: false,
                    showModal: true,
                    enableDragProxy: false,
                    showFooter: true,
                    footerStyle: "padding:6px 12px;",
                    showCloseButton: true,
                    width: 510,
                    height: 460
                });
				oWinDlg.show();
                mini.mask({
                    el: oWinDlg.getEl(),
                    cls: 'mini-mask-loading',
                    html: WF_CONST_LANG.LIST_LOADING //列表加载中...
                });
                $.ajax({
                    url: '/HTCommon/HT_Common.nsf/htmWFTechSel?OpenPage&Org='+(isWFOrg?"":"1"),
                    async: true,
                    dataType: 'text',
                    success: function(e) {
                        var selOrgDom = e;
                        oWinDlg.setBody( baidu.template(selOrgDom,PublicField) );
                        oWinDlg.setFooter("<div id='SubmitDocActionBar' style='text-align:right'></div>");
                        setTimeout(function(){wfAddToolbar("oWinDlg")},10);
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
                //ONLY_SELECT_ONE:仅允许选择一个人！
                alert(WF_CONST_LANG.ONLY_SELECT_ONE);
				mini.unmask(document.body);
                return
            }
        }	
        ClearRepeat("WFRouterID", TacheID); //增加路由线
        wfSubDocEnd(tarID, arrUser, TacheName);
    } else {
        alert(WF_CONST_LANG.SELECT_RElATED_PERSON);
		mini.unmask(document.body);
    }
}
function wfSubDocEnd(tarID, Users, TacheName) {
    var bWFAgreeMark = 0;
    $('[source="' + gForm.WFCurNodeID.value + '"]', gWFProcessXML).each(function(i, item) {
        if (item.getAttribute("target") == tarID) {
            if (getNodeValue(item, "WFAgreeMark") == WF_CONST_LANG.YES) {
                bWFAgreeMark = 1
            }
        }
    });
	log("是否意见标识: ",bWFAgreeMark?"YES":"NO");
    gForm.WFPreNodeID.value = gForm.WFCurNodeID.value;
    gForm.WFCurNodeID.value = tarID;
    gForm.WFTacheName.value = TacheName;
	log("目标环节ID: ",tarID);
	log("目标环节名称: ",TacheName);
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
			log("审批方式: ",strAppoveStyle);
			log("是否顺序审批: ",strSequenceApprove);
            if (strAppoveStyle == WF_CONST_LANG.MUTIL_PERSON) {
                if (strSequenceApprove == WF_CONST_LANG.YES) {
                    gForm.CurUser.value = arrUsers[0];
                    gForm.WFWaitApproval.value = arrUsers.slice(1).join(";");
                    bWrite = false;
					log("下一环节为多人顺序审批,审批人为: ",arrUsers[0]);
					log("下一环节为多人顺序审批,待审批人为: ",gForm.WFWaitApproval.value);
                }
            }
        }
    }
    if (bWrite) {
        gForm.CurUser.value = arrUsers.join(";");
		log("下一环节审批人为: ",gForm.CurUser.value);
    }
    wfSubDocEndSave(true, bWFAgreeMark);
}
//去重
function ClearRepeat(source, target) {
    var arrAllUser = gForm[source].value.replace(/\s/g, "").split(";");
    if ($.inArray(target, arrAllUser) < 0) {
        if (target != "") arrAllUser.push(target)
    }
    gForm[source].value = arrAllUser.join(";");
}
//增加环节名称
function wfAddTacheName() {
	var obj=mini.get("selTacheName"), selValue="", arrVal=[], tempData={}, _index="";
	for (var intM = 0, intL = gArrTacheName.length; intM < intL; intM++) {
		tempData.id=gArrTacheName[intM][0] + "^" + gArrTacheName[intM][1];
		tempData.name=gArrTacheName[intM][0];
        if (gArrTacheName[intM][2] == WF_CONST_LANG.YES) {
            _index = tempData.id;
        }
		arrVal.push(tempData);
		tempData={};
    }
	obj.set({data:arrVal});
	obj.setValue(_index);
	wfSelTacheChange(obj);
}
// 弹出框，确定按钮事件
function wfDlgBtnSave() {
    if (mini.get("selTacheName").value == "") {
        alert(WF_CONST_LANG.NO_TACHENAME); //环节名称为空，请您先选择！
        return
    }
    if (!confirm(WF_CONST_LANG.CONFIRM_SUBMIT)) {
        gForm.WFStatus.value = gWFStatus;
        return
    }
	mini.mask({
		el : document.body,
		cls : 'mini-mask-loading',
		html : '数据处理中...'
	});
    var arrVal = mini.get("selTacheName").value.split("^");
    wfSubDocProcess(arrVal[1], arrVal[0], arrVal[2], "empTarget");
}
// 改变环节名称
function wfSelTacheChange(tacID) {
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
    var listbox = mini.get(id),objSelTacheName=mini.get("selTacheName");
    var tarID = ((objSelTacheName!=undefined)&&(objSelTacheName.value!="")) ? objSelTacheName.value.split("^")[1] : "";
    if (tarID != "") {
        var objCurNode = $(tarID, gWFProcessXML);
        if (objCurNode.length == 1) {
            var strAppoveStyle = getNodeValue(objCurNode[0], "WFApproveStyle");
            if (strAppoveStyle == "" && listbox.data.length > 0) {
                alert(WF_CONST_LANG.ONLY_SELECT_ONE); //仅允许选择一个人！
				mini.unmask(document.body);
                return
            }
        }
    }
    if ($.grep(listbox.data,
    function(item) {
        return name == item.name;
    }).length > 0) {
        alert("'" + name + "' "+WF_CONST_LANG.EXITED);
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
/*
公式比较
@V6.1 -去除旧的公式比较，仅留JavaScript比较法
*/
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
				ConditionFormula = ConditionFormula.replace(tmp, v);
				log("公式: ",ConditionFormula);
			});
			return new Function("return " + ConditionFormula)();
		}else{
			alert(WF_CONST_LANG.COMPARE_METHOD_ALERT);
		}
    } catch(e) {
        alert(WF_CONST_LANG.FORMULA_ERROR);
        return false
    }
}
/*--------------------------------------Common--------------------------------------*/
function wfSubDocEndSave(bGo2Next, bWFAgreeMark) {
    /*添加流转信息*/
    var tmpNode = $.parseXML("<" + gCurNode[0].nodeName + "/>").documentElement,
    strIdea = "",
    bCloneNode = true;
    tmpNode.setAttribute("tache", getNodeValue(gCurNode[0], "WFNodeName"));

    //判断当前审批人是否有委托---（王茂林，未完善）
    tmpNode.setAttribute("user", gUserCName);
    tmpNode.setAttribute("time", gServerTime);
    if (bGo2Next) {
		log("是否为多人审批过程: ",bGo2Next?"YES":"NO");
        if (gForm.WFTacheName.value == WF_CONST_LANG.WORKFLOW_END) { //流程结束
            gAction = gUserCName + WF_CONST_LANG.USE_ACTION
        } else {
            gAction = gUserCName + WF_CONST_LANG.ACTION_TO + gForm.CurUser.value + WF_CONST_LANG.SYMBOL_END
        }
    }
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
        })
    }
    if (bCloneNode) {
        $(tmpNode).appendTo(gWFLogXML)
    }
	if(""!==XML2String(gWFLogXML)){
		gForm.WFFlowLogXML.value = XML2String(gWFLogXML)
	}
	log("当前处理人: ",gUserCName);
    ClearRepeat("AllUser", gUserCName);
    fnResumeDisabled();
	log("提交代理名称: ",gWQSagent);
    gForm["$$QuerySaveAgent"].value = gWQSagent;
    //页面提交后执行
    var _pe = gPageEvent["SaveAfter"];
    if (_pe.replace(/\s/, "") != "") {
        try {
			new Function(_pe)()
        } catch(e) {
			alert(WF_CONST_LANG.SAVE_AFTER + "< " + _pe + " > "+WF_CONST_LANG.PAGE_NO_INIT)
        }
    }
    /*通知方式*/
    if (bGo2Next) {
        var strWFRouterID = gForm.WFRouterID.value,
        arrID = $.trim(strWFRouterID) == "" ? [] : strWFRouterID.split(";");
        if (arrID.length > 0) {
            var objCurNode = $(arrID[arrID.length - 1], gWFProcessXML);
            if (objCurNode.length > 0) {
                try {
                    if (getNodeValue(objCurNode[0], "WFRtxEnabled") == WF_CONST_LANG.YES) {
                        var link = "/" + gCurDB + "/vwComOpenDoc/" + gDocKey + ".?OpenDocument",
                        msg = wfMsgContent(getNodeValue(objCurNode[0], "WFRtxContent"));
						log("RTX.link: ",link);
						log("RTX.msg: ",msg);
                        var strMo = "";
                        if (typeof gForm.WFModule!="undefined") {
                            strMo = gForm.WFModule.value
                        }
						log("RTX.title: ",strMo);
                        var user = "",
                        args = "&L=" + link + "&M=" + msg + "&T=" + strMo;

                        if (getNodeValue(objCurNode[0], "WFAllObject") == WF_CONST_LANG.YES) {
                            user = "all";
                        } else if (getNodeValue(objCurNode[0], "WFAllReadUsers") == WF_CONST_LANG.YES) {
                            user = gForm.AllUser.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
                        } else if (getNodeValue(objCurNode[0], "WFOnlyInitiator") == WF_CONST_LANG.YES) {
                            user = gForm.WFInitiator.value.split(";").concat(gForm.CurUser.value.split(";")).join(",");
                        } else {
                            user = gForm.CurUser.value.split(";").join(",");
                        }
						log("RTX.user: ",user);
                        args += "&U=" + user;
						if(!DiyJs.webDebug){
							$.ajax({
								url: encodeURI("/" + gCommonDB + "/(agtWFRTX)?OpenAgent" + args),
								cache: false,
								async: false,
								success: function(txt) {
									//strU=txt;
								}
							})
						}
                    }
                } catch(e) {log("RTX发送异常")}
            }
        }
    }
	log("----页面提交结束----");
	setTimeout(function(){
		var oWinDlg = mini.get('oWinDlg');
        if (typeof oWinDlg!="undefined") {
			oWinDlg.destroy()
		}
		oWinDlg = mini.get('oCheckUserDlg');
        if (typeof oWinDlg!="undefined") {
			oWinDlg.destroy()
		}
		mini.unmask(document.body);
	},1000);
	if(DiyJs.webDebug){
		//这里还不够完善
		gForm.WFCurNodeID.value=gForm.WFPreNodeID.value;
		gForm.CurUser.value=gForm.WFPreUser.value;
	}else{
		gForm.submit()
	}
}
//处理消息提醒内容
function wfMsgContent(content) {
    var strContent = $.trim(content);
    if (strContent != "") {
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
    }
    return strContent == "" ? "-*-": strContent;
}
//处理自定义公式
function wfFormula(arrItems, IsWeb) {
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
                                    _tmp = new Function("return ("+item+")")();
                                    if ($.type(_tmp) == "array") {
                                        arrT = arrT.concat(_tmp);
                                    } else {
                                        alert(WF_CONST_LANG.WEB_FORMULA_ERROR);
                                        return;
                                    }
                                } catch(e) {}
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
//常用语句
function goAppendComLang(val) {
    if (val.replace(/\s/g, "") != "") {
        var tmp = document.getElementById("WFIdea");
        //if(tmp.value==""){tmp.value=val}else{tmp.value=tmp.value+"\n"+val}
        tmp.value = val
    }
}
//查看流程图
function goLookWorkFlow() {
    if (window != top) {
        top.goWorkFlow(gCurDBName, gCurDocID, false);
    } else {
        var linkType = "height=580,width=880,top=50,left=200,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no";
        var link = "/" + gWorkFlowDB + "/htmWFViewWindow?ReadForm&db=" + gCurDBName + "&id=" + gCurDocID + "&cu=" + encodeURI(gForm.CurUser.value) + "&status=" + gWFStatus + "&gWFTacheName=" + encodeURI(gForm.WFTacheName.value);
        window.open(link, "newwindow", linkType);
    }
}
//流程终止
function wfStop() {
    //确定要做相应操作吗？
    if (!gIsNewDoc) {
        if (confirm(WF_CONST_LANG.CONFIRM_OPERATION)) {
            //if(confirm("确定要做相应操作吗？")){
            $.ajax({
                url: encodeURI("/" + gCommonDB + "/agtWFStop?OpenAgent&DocID=" + gCurDocID + "&TDB=" + gCurDBName + "&User=" + gUserCName),
                dataType: "text",
                success: function(txt) {
                    var intM = parseInt(txt, 10);
                    if (intM == 0) {
                        alert(WF_CONST_LANG.STOP_ERROR_0)  //alert("可能系统有异常，未成功终止，请联系管理员！")
                    } else if (intM == 1) {
                        alert(WF_CONST_LANG.STOP_ERROR_1)  //alert("已成功终止！");
                        window.location.reload()
                    } else if (intM == 2) {
                        alert(WF_CONST_LANG.STOP_ERROR_2)  //alert("文档此时正在被他人处理，不能被终止！")
                    } else if (intM == 3) {
                        alert(WF_CONST_LANG.STOP_ERROR_3)  //alert("流程已经被终止或结束，不能被取回！")
                    } else {
                        alert(WF_CONST_LANG.STOP_ERROR_4)  //alert("您不是文档的提交者，不能被终止！")
                    }
                }
            })
        }
    } else {
        alert(WF_CONST_LANG.STOP_ERROR)                    //您好，草稿状态时，此操作无效！
    }
}
//在工具条中增加按钮
function wfAddToolbar(id) {
    var arrBtns = [
	{
        name: WF_CONST_LANG.SEARCH,//查询
        ico: "icon-search",
        clickEvent: "wfOrgSearch()",
        align: "1",
        isHidden: "1",
		id:"wfS"
    },
	{
        name: WF_CONST_LANG.REFRESH,//刷新
        ico: "icon-reload",
        clickEvent: "wfOrgSearch(true)",
        align: "1",
        isHidden: "1",
		id:"wfRe"
    },
	{
        name: WF_CONST_LANG.CANCEL,
        ico: "icon-cancel",
        clickEvent: "mini.get(\'" + id + "\').destroy();gForm.WFStatus.value=gWFStatus;gForm.WFTacheName.value='';",
        align: "2",
        isHidden: "0"
    },
    {
        name: WF_CONST_LANG.OK,
        ico: "icon-ok",
        clickEvent: "wfDlgBtnSave()",
        align: "2",
        isHidden: "0"
    }];
	$("<input type='text' class='mini-textbox' id='searchValue' visible=false />").appendTo("#SubmitDocActionBar");
    var btnHtml = "";
    for (var i = 0; i < arrBtns.length; i++) {
        btnHtml = "<a class='mini-button' id='"+(arrBtns[i].id?arrBtns[i].id:"")+"' style='"+(arrBtns[i].align=="1"?"":"float:right")+"' plain=true visible="+(arrBtns[i].isHidden=="1"?false:true)+" iconCls='" + arrBtns[i].ico + "'>" + arrBtns[i].name + "</a>";
        $(btnHtml).appendTo("#SubmitDocActionBar").attr('onClick', arrBtns[i].clickEvent);
    }
    mini.parse();
    wfAddTacheName();
}
//组织搜索
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
//选择组织机构切换面板时控制查询按钮功能
function changTab(e){
	if(!(mini.get("wfS")&&mini.get("wfRe"))){
		return;
	}
	if(e.tab.name=="OrgTree"){
		var tree=mini.get("orgTree");
		if(typeof mini.get("orgTree")!="undefined"&&tree.getData().length==0){
			loadOrgTree()
		}
		mini.get("wfS").set({visible:true});
		mini.get("wfRe").set({visible:true});
		mini.get("searchValue").set({visible:true});
		return;
	}
	mini.get("wfS").set({visible:false});
	mini.get("wfRe").set({visible:false});
	mini.get("searchValue").set({visible:false});
}
//将XML对象转换为字符串
function XML2String(xmlDom){
	try{
		return (typeof XMLSerializer!=="undefined") ? (new window.XMLSerializer()).serializeToString(xmlDom) : xmlDom.xml;
	}catch(e){
		return ""
	}
}
//加载组织树
function loadOrgTree() {
    var orgTree = mini.get("orgTree");
	var oWinDlg = mini.get('oWinDlg');
	mini.mask({
		el: document.body,
		cls: 'mini-mask-loading',
		html: WF_CONST_LANG.LIST_LOADING //组织数据加载中...
	});
    $.ajax({
        url: encodeURI("/" + gOrgDB + "/vwPersonTreeJson?OpenView&Count=9999&ExpandAll"),
        cache: false,
        success: function(MenuText) {
            if (MenuText.indexOf(",") > -1) {
                orgTree.loadList(new Function("return [" + MenuText.substr(1) + "]")(), "id", "pid");
				mini.unmask(document.body);
            }
        }
    });
}
//组织树元素选择
function treeNodeClick(e) {
    if (e.node.isdept != "1") {
        AddValue(e.node.name, "selectList")
    }
}
//加载已选元素
function listNodeClick(e) {
    AddValue(e.sender.getSelected().name, "selectList")
}
//日志
function log() {
	if(typeof DiyJs == 'undefined'){
		window.DiyJs={webDebug:0}
	}
    if (DiyJs.webDebug==0) {
        return;
    }
    var msg = '[ht.workflow] ' + Array.prototype.join.call(arguments,'');
    if (window.console) {
		if(window.console.debug)
			window.console.debug(msg)
		else
			window.console.log(msg)
    }
    else if (window.opera && window.opera.postError) {
        window.opera.postError(msg)
    }
}
