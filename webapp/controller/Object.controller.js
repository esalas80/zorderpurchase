sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/core/Core",
    "sap/m/Dialog",
    'sap/m/MessageToast',
    "sap/m/MessageBox",
    'sap/m/DialogType',
    "sap/m/Label",
	"sap/m/Input",
    "sap/m/Button",
    "sap/m/ButtonType",
    "./Worklist.controller",
], function (BaseController, JSONModel, History, formatter, Core, Dialog, MessageToast, MessageBox, DialogType, Label, Input, Button, ButtonType, wklCont) {
    "use strict";

    return BaseController.extend("gm.zorderpurchase.controller.Object", {

        formatter: formatter,
        wklCont: new wklCont(this),
        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit : function () {
            this._aValidKeys=[
                "Items",
                "attach"
            ];
            var dataActiveTab = {
                keyActive:"Items"
            }
            var modelTabActive = new JSONModel(dataActiveTab);
            sap.ui.getCore().setModel(modelTabActive, "ActiveTabModel");
            var oViewModel = new JSONModel({
                    busy : true,
                    delay : 0
                });
            var e=new JSONModel({
                busy:false,
                delay:0,
                lineItemListTitle:this.getResourceBundle().getText("detailLineItemTableHeading"),
                currency:"MXN",
                totalOrderAmount:0,
                selectedTab:""
            });
            
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(e,"detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this))
            this.setModel(oViewModel, "objectView");
            var userData = new sap.ushell.services.UserInfo();
            this.UserID=userData.getUser().getId();
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */


        /**
         * Event handler  for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the worklist route.
         * @public
         */
        onNavBack : function() {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("worklist", {}, true);
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched : function (oEvent) {
            var argument =  oEvent.getParameter("arguments");
           
            this._sObjectId=argument.objectId;
            if(this.getModel("appView").getProperty("/layout")!=="MidColumnFullScreen"){
                this.getModel("appView").setProperty("/layout","TwoColumnsMidExpanded")
            }
            this.loadDetail(this._sObjectId);
            var i=argument["?query"];
            if(i&&this._aValidKeys.indexOf(i.tab)>=0){
                this.getView().getModel("detailView").setProperty("/selectedTab",i.tab);
                this.getRouter().getTargets().display(i.tab)
            }else{
                this.getRouter().navTo("object",{objectId:this._sObjectId,query:{tab:"Items"}},true)
            }
        },
        _onMetadataLoaded:function(){
            var e=this.getView().getBusyIndicatorDelay(),
                t=this.getModel("detailView"),
                i=this.byId("list"),
                o=i.getBusyIndicatorDelay();
            t.setProperty("/delay",0);
            t.setProperty("/lineItemTableDelay",0);
            i.attachEventOnce("updateFinished",function(){t.setProperty("/lineItemTableDelay",o)});
            t.setProperty("/busy",true);
            t.setProperty("/delay",e)
        },
       /* Reading the data from the backend and setting it to the model. */
        /**
         * @date 2022-11-28
         * @param {any} detailId
         * @returns {any}
         */
        loadDetail: async function(detailId){
            var that = this;
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var oViewModel = this.getModel("objectView");
            oViewModel.setProperty("/busy", false);
            var dataSelectedOrder = sap.ui.getCore().getModel("selectedOrder").getData();
            var dataHeaderDetail = sap.ui.getCore().getModel("selectedOrderHeader").getData();
            var itemListDetail = sap.ui.getCore().getModel("ListdetailModel").getData();
            var oServiceModel = this.getView().getModel("modelattach");
            var entidad = "/ZTERM_DESCSet(Zterm='"+dataSelectedOrder.zterm+"')"
            var payCondPromise = new Promise(function(resolve,reject){
				oServiceModel.read(entidad,{
					success: function(res){
						resolve(res);
					},
					error: function(err){
						reject(err);
					}
				});
			});
            await payCondPromise.then(function(resp){
                dataHeaderDetail.vtext=resp.Text;
            });
            oViewModel.setData(dataSelectedOrder);
            var orderModel = new sap.ui.model.json.JSONModel(dataSelectedOrder);
            var headerOrderModel = new sap.ui.model.json.JSONModel(dataHeaderDetail);
            var itemlistModel = new sap.ui.model.json.JSONModel(itemListDetail);
             
            this.setModel(orderModel,"orderModel")
            this.setModel(headerOrderModel,"HeaderdetailModel")
            this.setModel(itemlistModel,"ListdetailModel")
        },
       /* Reading the data from the backend and setting it to the model. */
        handleSelectionChange: async function(oEvent){
            sap.ui.core.BusyIndicator.show(); 
            var that = this;
            var dataRow = oEvent.getParameters().listItem.getBindingContext("ListdetailModel").getObject();
            var modelo = this.getGenericModel();
            var entidad = "/ZMM_CDS_OC_POS(ebeln='"+dataRow.ebeln+"',ebelp='"+dataRow.ebelp+"')"
            var detallePromise = new Promise(function(resolve,reject){
				modelo.read(entidad,{
					urlParameters: {
	    			   "$expand": "to_direccion,to_servicio"
					},
					success: function(res){
						resolve(res);
					},
					error: function(err){
						reject(err);
					}
				});
			});
            var auxModel = new sap.ui.model.json.JSONModel();
            await detallePromise.then(function(resp){
                sap.ui.core.BusyIndicator.hide();
                auxModel.setData(resp);
                sap.ui.getCore().setModel(auxModel, "OderDetail");
                that.getRouter().navTo("itemDetail",{objectId:dataRow.ebeln,itemId:dataRow.ebelp})
            });
            
            
        },
       /* A function that is called when the user presses the close button on the detail page. */
        onCloseDetailPress:function(){
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen",false);
            this.getOwnerComponent().oListSelector.clearMasterListSelection();
            this.getRouter().navTo("worklist")
        },

       /* Toggling the full screen mode. */
        toggleFullScreen:function(){
            var e=this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen",!e);
            if(!e){
                this.getModel("appView").setProperty("/previousLayout",this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout","MidColumnFullScreen")
            }else{
                this.getModel("appView").setProperty("/layout",this.getModel("appView").getProperty("/previousLayout"))
            }
        },
       /* The above code is a function that is called when a tab is selected. */
        /**
         * @date 2022-11-28
         * @param {any} oEvent
         * @returns {any}
         */
        onTabSelect: async function(oEvent){
            var selectedOrder  =  this.getModel("orderModel");
            if(!selectedOrder){
                MessageToast.show("Seleccione  una solicitud de pedido");
                return;
            }
            sap.ui.core.BusyIndicator.show()
            var tab = oEvent.getSource().getSelectedKey();
            sap.ui.getCore().getModel("ActiveTabModel").setProperty("/keyActive", tab);
            var dataOrder  =  this.getModel("orderModel").getData();
            var modelo = this.getView().getModel("modelattach");
            if(tab==="attach"){
                var entidad = "/get_attach_POSet"
                var arrFilter=[];
                arrFilter.push(new sap.ui.model.Filter("Ebeln", sap.ui.model.FilterOperator.EQ, dataOrder.ebeln)); 
                var atachments = await this.getEntityV2(modelo,entidad, arrFilter) 
                var data=[];
                if(atachments.results.length > 0){
                    
                   for (let index = 0; index < atachments.results.length; index++) {
                        var elemnt ={
                            Ebeln: atachments.results[index].Ebeln,
                            ObjName: atachments.results[index].ObjName,
                            ObjType: atachments.results[index].ObjType,
                            File: atachments.results[index].File,
                            Icon:  this.getIcon(atachments.results[index].ObjType),
                            Name: atachments.results[index].Name
                        }
                        data.push(elemnt)
                   }
                   
                } 
                var auxModel = new sap.ui.model.json.JSONModel(data); 
                this.getView().setModel(auxModel,"ListAttachModel");
            }
            else if(tab==="order"){
                var entidad = "/PDF_PREVIEWSet(Ebeln='"+dataOrder.ebeln+"')"
                var document;
                await this.getEntityV2(modelo,entidad, "").then(value=>{
                    document = value;
                }).catch((e)=>{
                    sap.ui.core.BusyIndicator.hide();
                }) 
                var data=[];
                if(document && (document.File !== undefined && document.File !== "")){
                    data.push(document)
                }
                var auxOrderModel = new sap.ui.model.json.JSONModel(data); 
                this.getView().setModel(auxOrderModel,"ListOrderModel");
            }
            else if(tab==="text"){
                var entidad = "/TextosSet"
                var texts;
                var arrFilter=[];
                arrFilter.push(new sap.ui.model.Filter("Ebeln", sap.ui.model.FilterOperator.EQ, dataOrder.ebeln)); 
                await this.getEntityV2(modelo,entidad, arrFilter).then(value=>{
                    texts = value.results;
                }).catch((e)=>{
                    sap.ui.core.BusyIndicator.hide();
                });
                var auxOrderModel = new sap.ui.model.json.JSONModel(texts); 
                this.getView().setModel(auxOrderModel,"ListTextModel");
            }
            else if(tab == "approvers"){
                var entidad = "/release_strategySet";
                var texts;
                var arrFilter=[];
                arrFilter.push(new sap.ui.model.Filter("Vbeln", sap.ui.model.FilterOperator.EQ, dataOrder.ebeln.toString())); 
                await this.getEntityV2(modelo,entidad, arrFilter).then(value=>{
                    texts = value.results;
                    if (texts.length > 0) {
                        for (let index = 0; index < texts.length; index++) {
                            var approve = texts[index].Libero? "<strong style=\"color:green;\">Si</strong>":"<strong style=\"color:#B71542;\">No</strong>"
                            var Relstrtx = "Denominaci??n de estrategia: " + texts[index].Relstrtx +"<br>";
                            var element = texts[index].Description +" <br>"+ Relstrtx + "Liber??: " + approve;
                            texts[index].text= element;
                        }
                    }

                }).catch((e)=>{
                    sap.ui.core.BusyIndicator.hide();
                });
                var auxOrderModel = new sap.ui.model.json.JSONModel(texts); 
                this.getView().setModel(auxOrderModel,"approversNodel");
            }
            sap.ui.core.BusyIndicator.hide();
        },
        /* A function that returns an icon based on the file type. */
        /**
         * @date 2022-11-28
         * @param {any} type
         * @returns {any}
         */
        getIcon:function(type){
            var icon="sap-icon://document"
            switch (type) {
                case "JPG":
                    icon = "sap-icon://attachment-photo";
                    break;
                case "PNG":
                    icon = "sap-icon://picture";
                    break;
                case "PDF":
                    icon = "sap-icon://pdf-attachment";
                    break; 
                case "DOC":
                    icon = "sap-icon://doc-attachment";
                    break;        
                case "DOCX":
                    icon = "sap-icon://doc-attachment";
                    break;
                case "TXT":
                    icon = "sap-icon://attachment-text-file";
                    break;
                case "XLS":
                    icon = "sap-icon://excel-attachment";
                    break;  
                case "XLSX":
                    icon = "sap-icon://excel-attachment";
                    break;              
                case "CSV":
                    icon = "sap-icon://excel-attachment";
                    break;
                case "MSG":
                    icon = "sap-icon://email";
                    break;
                case "EML":
                    icon = "sap-icon://email";
                    break;    
                case "ZIP":
                    icon = "sap-icon://attachment-zip-file";
                    break;        
                case "RAR":
                    icon = "sap-icon://attachment-zip-file";
                    break;      
                default:
                    icon = "sap-icon://document";
                    break;
            }
            return icon;
        },
       /* Downloading the file from the server. */
        handleSelectionAttach: function(oEvent){
            sap.ui.core.BusyIndicator.show();
            var dataRow = oEvent.getSource().getBindingContext("ListAttachModel").getObject();
            var dtValue = new Date();
            //var fileName = "Document_" + String(dtValue.getDate()) + String(dtValue.getMonth()+1) + String(dtValue.getFullYear()) + String(dtValue.getHours()) + String(dtValue.getMinutes());
            var fileName = dataRow.Name +"_"+  String(dtValue.getDate()) + String(dtValue.getMonth()+1) + String(dtValue.getFullYear()) + String(dtValue.getHours()) + String(dtValue.getMinutes());
            this.downloadFile(dataRow.File, fileName, dataRow.ObjType)
            sap.ui.core.BusyIndicator.hide();
        },
        /* Checking if the browser is Safari or not. If it is Safari, it will download the file. If it
        is not Safari, it will open the file in a new tab. */
        handleSelectionViewOrder:function(oEvent){
            sap.ui.core.BusyIndicator.show();
            
            var userAgentString = navigator.userAgent
            var navSafari = userAgentString.indexOf("Safari") > -1;
            var isChrome = userAgentString.indexOf("Chrome") > -1;
            navSafari = !(navSafari && isChrome);
            var dataRow = oEvent.getSource().getBindingContext("ListOrderModel").getObject();
            var dtValue = new Date();
            var fileName = dataRow.Ebeln;
            if( navSafari ){
                this.downloadFile(dataRow.File,fileName, "PDF")
            }else{
                this.onViewerPDF(dataRow.File,fileName)
            }           
            sap.ui.core.BusyIndicator.hide();
        },
        /* Opening a new window and writing the pdf to the new window. */
        /**
         * @date 2022-11-28
         * @param {any} pdf
         * @param {any} namePdf
         * @returns {any}
         */
        onViewerPDF: function(pdf, namePdf) {
            
            var objbuilder = ('<object width="100%" height="100%" data="data:application/pdf;base64,');
            objbuilder += (pdf);
            objbuilder += ('" type="application/pdf" class="internal">');
            objbuilder += ('<embed src="data:application/pdf;base64,');
            objbuilder += (pdf);
            objbuilder += ('" type="application/pdf" />');
            objbuilder += ('</object>');
            var win = window.open("#", "_blank");
            const title = namePdf;
            win.document.write('<html><title>' + title +
                '</title><body style="margin-top:0px; margin-left: 0px; margin-right: 0px; margin-bottom: 0px;">');
            win.document.write(objbuilder);
            win.document.write('</body></html>');
        },
       /* Creating a link to the file and then clicking on it. */
        /**
         * @date 2022-11-28
         * @param {any} data
         * @param {any} nombre
         * @param {any} type
         * @returns {any}
         */
        downloadFile: function (data, nombre, type) {
			//data = Xstring del servicio que contienen el pdf
			var element = document.createElement('a');
            var objectType = this.getMimeType(type)
            switch (type) {
                case "MSG":
                    nombre += "." + type.toLowerCase(); 
                    break;
                case "EML":
                    nombre += "." + type.toLowerCase(); 
                    break;
                case "ZIP":
                    nombre += "." + type.toLowerCase(); 
                    break;
                case "RAR":
                    nombre += "." + type.toLowerCase(); 
                    break;        
                default:
                    break;
            };
			element.setAttribute('href', 'data:'+ objectType +';base64,' + data);
			element.setAttribute('download', (nombre ? nombre : "Documento"));
			element.style.display = 'none';
			document.body.appendChild(element);
			element.click();
			document.body.removeChild(element)
		},
       /* Getting the mime type of the file. */
        getMimeType: function(type){
            var objType=""
            switch (type) {
                case "JPG":
                    objType = "image/jpeg";
                    break;
                case "PNG":
                    objType = "image/png";
                    break;
                case "PDF":
                    objType = "application/pdf";
                    break; 
                case "DOC":
                    objType = "application/msword";
                    break;        
                case "DOCX":
                    objType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    break;
                case "TXT":
                    objType = "text/plain";
                    break;
                case "XLS":
                    objType = "application/vnd.ms-excel";
                    break;  
                case "XLSX":
                    objType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    break; 
                case "CSV":
                    objType = "text/csv";
                    break;           
                case "MSG":
                    objType = "application/vnd.ms-outlook";
                    break;          
                case "EML":
                    objType = "application/octet-stream";
                    break;                 
                case "ZIP":
                    objType = "application/zip";
                    break;                       
                case "RAR":
                    objType = "application/rar";
                    break;    
                default:
                    objType = "application/pdf";
                    break;
            }
            return objType    
        },
        /* The above code is creating a dialog box with two buttons. */
        /**
         * @param  {} option
         * @param  {"RechazarSolicitud"if(this.oSubmitDialog} ;return;}vartitle=option===1?"AprobarSolicitud"
         */
        onPressAction: function(option){
            var ModelOrder  =  this.getModel("orderModel");
            if(!ModelOrder){
                MessageToast.show("Seleccione  una solicitud de pedido");
                return;
            }
            var title=option=== 1? "Aprobar Solicitud": "Rechazar Solicitud"
            if(this.oSubmitDialog){
                this.oSubmitDialog.destroy(); 
                this.oSubmitDialog = undefined; 
            } 
            Core.byId("submissionNote")? Core.byId("submissionNote").setValue(""): "";
            if (!this.oSubmitDialog) {
				this.oSubmitDialog = new Dialog({
					type: DialogType.Message,
					title: title,
					content: [
						new Label({
							text: "??Desea "+ title+"?",
							labelFor: "submissionNote"
						}),
						new sap.m.TextArea("submissionNote", {
							width: "100%",
                            type: "Text",
							placeholder: "Agregar Nota (No requerido)",
                            maxLength: 150
						})
					],
                    beginButton: new Button({
						type: ButtonType.Emphasized,
						text: "Enviar",
						press: function () {
							var sText = Core.byId("submissionNote").getValue() !==""?Core.byId("submissionNote").getValue():".";
							//MessageToast.show("Comentario es: " + sText);
                            this.onSendDialogApprobe(option, sText)
							this.oSubmitDialog.close();
						}.bind(this)
					}),
					endButton: new Button({
						text: "Cancelar",
						press: function () {
							this.oSubmitDialog.close();
						}.bind(this)
					})
				});
			}
			this.oSubmitDialog.open();
        },
        /* The above code is a function that is called when a user clicks on a button. The function is
        called onSendDialogApprobe.
        The function is called with two parameters, option and message.
        The function is called from the controller.
        The function is called from the view.
        The function is called from the model.
        The function is called from the manifest.
        The function is called from the component.
        The function is called from the manifest. */
        /**
         * @param  {} option
         * @param  {} message
         * @param  {"SolicitudRechazada"sap.ui.core.BusyIndicator.show(} {varthat=this;vartitle=option===1?"SolicitudAprobada"
         */
        onSendDialogApprobe: function(option, message){
            var that = this;
            var title = option === 1? "Solicitud Aprobada": "Solicitud Rechazada"
            sap.ui.core.BusyIndicator.show();
            var orderdata = this.getView().getModel("orderModel").getData();
            var WiId = orderdata.wi_id;
            var ebln=orderdata.ebeln;
            var genericModel = this.getView().getModel("modelattach");
            var user = this.UserID ==="DEFAULT_USER" || this.UserID ==="" ? "EXT_OMAR" :  this.UserID ;
            var entidad = "/release_poSet(WiId='"+WiId+"',Uname='"+ user +"',Ebeln='"+ ebln +"',Approved="+option+",Rmessage='"+message.trim().replace(/ /g,"%20")+"')";
            genericModel.read(entidad, {
                success: function(oData, response) {
                    sap.ui.core.BusyIndicator.hide();
                    var data = response.data
                    
                        MessageBox.success("la operaci??n se realiz?? con exito", {
                            icon: MessageBox.Icon.SUCCESS,
                            title: title,
                            onClose: function(){
                                var ordermodel = that.getView().getModel("orderModel");
                                ordermodel.setData({modelData:{}});
                                ordermodel.updateBindings(true);
                                var modeldetail = that.getView().getModel("ListdetailModel");
                                modeldetail.setData({modelData:{}});
                                modeldetail.updateBindings(true);
                                that.onCloseDetailPress();
                                that.getRouter().navTo("worklist")
                            }
                        });
                },
                error: function(oData, response) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error al ejecutar la operaci??n");
                }
            });
        }

    });

});
