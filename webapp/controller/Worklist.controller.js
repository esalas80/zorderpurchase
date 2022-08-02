sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Core",
    "sap/m/Dialog",
    'sap/m/MessageToast',
    'sap/m/DialogType',
    "sap/m/Label",
	"sap/m/Input",
    "sap/m/Button",
    "sap/m/ButtonType",
    "./DialogApprob"
], function (BaseController, JSONModel, formatter, MessageBox, Fragment, Filter, sorter, FilterOperator, Core, Dialog, MessageToast, DialogType, Label, Input, Button, ButtonType, DialogApprob) {
    "use strict";

    return BaseController.extend("gm.zorderpurchase.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit : function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];
            var oList = this.byId("list");
            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText : this.getResourceBundle().getText("tableNoDataText")
            });
            this.setModel(oViewModel, "worklistView");
            this._oList = oList;
            // keeps the filter and search state
            this._oListFilterState = {
                aFilter : [],
                aSearch : []
            };
            var userData = new sap.ushell.services.UserInfo();
            this.UserID=userData.getUser().getId();
            this.onGetInitialData();
        },
        onGetInitialData: async function(){
            sap.ui.core.BusyIndicator.show();
            var oList = this.byId("list");
            var arrFilter=[];
            var user = this.UserID ==="DEFAULT_USER" || this.UserID ==="" ? "EXT_OMAR" :  this.UserID ;
            var modelo = this.getGenericModel();
            var entidad = "/ZMM_CDS_OC"
            var detallePromise = new Promise(function(resolve,reject){
				modelo.read(entidad,{
					urlParameters: {
	    			   "$expand": "to_position"
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
            detallePromise.then(function(resp){
                sap.ui.core.BusyIndicator.hide();
                console.log(resp.results)
                if(resp.results.length > 0){
                    for (let index = 0; index < resp.results.length; index++) {
                        var vImporte = 0;
                        if(resp.results[index].to_position.results.length > 0){
                            for (let i = 0; i < resp.results[index].to_position.results.length; i++) {
                                vImporte += parseFloat(resp.results[index].to_position.results[i].netwr.trim())
                            }
                            resp.results[index].Importe = vImporte.toFixed(3);
                            resp.results[index].Items = resp.results[index].to_position.results.length;
                        }
                    }
                }
                auxModel.setData(resp.results);
            }).catch(function(error){
                sap.ui.core.BusyIndicator.hide();
                MessageBox.error(error);
            });
            oList.setModel(auxModel,"ListModel");
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress : function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack : function() {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },

        onUpdateFinished : function (oEvent) {
            // update the list object counter after new data is loaded
            this._updateListItemCount(oEvent.getParameter("total"));
        },
         /**
         * Sets the item count on the list header
         * @param {integer} iTotalItems the total number of items in the list
         * @private
         */
          _updateListItemCount: function (iTotalItems) {
            var sTitle;
            // only update the counter if the length is final
            if (this._oList.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
                this.getModel("worklistView").setProperty("/title", sTitle);
            }
        },
        onSearch : function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                return;
            }

            var sQuery = oEvent.getParameter("query");
            var cFilter = [];
            if (sQuery) {
                cFilter.push(new sap.ui.model.Filter("ebeln", sap.ui.model.FilterOperator.Contains, sQuery));                                   
            } 
            this._applySearch(cFilter);

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh : function () {
            var oTable = this.byId("list");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Shows the selected item on the object page
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showObject : function (oItem) {
            sap.ui.core.BusyIndicator.hide();
            this.getRouter().navTo("object", {
                objectId: oItem.ebeln
            });
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function(aFilters) {
           
            this._oList.getBinding("items").filter(aFilters, "Application");
        },
        onSelectionChange:async  function (oEvent) {
            sap.ui.core.BusyIndicator.show()
            var tab = this.getView().byId("iconTabBar").getSelectedKey()
            if(tab==="attach") this.getView().byId("iconTabBar").setSelectedKey("Items");
            if(tab==="order") this.getView().byId("iconTabBar").setSelectedKey("Items");
            var object =oEvent.getSource().getSelectedItem().getBindingContext("ListModel").getObject();    
            var nroOrden = object.Banfn;
            var modelo = this.getGenericModel();
            var entidad = "/ZMM_CDS_OC('"+object.ebeln+"')/to_position";
            var detailData = await this.getEntityV2(modelo,entidad,"");
            var auxModel = new sap.ui.model.json.JSONModel(detailData.results);
            var orderModel = new sap.ui.model.json.JSONModel(object);
            this.getView().setModel(auxModel,"ListdetailModel");
            this.getView().setModel(orderModel,"orderModel");
            sap.ui.getCore().setModel(orderModel,"selectedOrder");
            sap.ui.core.BusyIndicator.hide();
            
        },
        handleSelectionChange: async function(oEvent){
            sap.ui.core.BusyIndicator.show();
            
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
            });
            this._showObject(dataRow);
        },
        onTabSelect: async function(oEvent){
            var itemselected =this.byId("list").getSelectedItems();
            if(itemselected.length === 0){
                MessageToast.show("Seleccione  una solicitud de pedido");
                return;
            }
            sap.ui.core.BusyIndicator.show()
            var tab = oEvent.getSource().getSelectedKey();
            var dataOrder  =  sap.ui.getCore().getModel("selectedOrder").getData();
            if(tab==="attach"){
                
                var modelo = this.getView().getModel("modelattach");
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
                            Icon:  this.getIcon(atachments.results[index].ObjType)
                        }
                        data.push(elemnt)
                   }
                   
                } 
                var auxModel = new sap.ui.model.json.JSONModel(data); 
                this.getView().setModel(auxModel,"ListAttachModel");
            }
            else if(tab==="order"){
                var modelo = this.getView().getModel("modelattach");
                var entidad = "/PDF_PREVIEWSet(Ebeln='"+dataOrder.ebeln+"')"
                var document = await this.getEntityV2(modelo,entidad, "") 
                var data=[];
                if(document && (document.File !== undefined && document.File !== "")){
                    data.push(document)
                }
                var auxOrderModel = new sap.ui.model.json.JSONModel(data); 
                this.getView().setModel(auxOrderModel,"ListOrderModel");
            }
            sap.ui.core.BusyIndicator.hide()
        },
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
                default:
                    icon = "sap-icon://document";
                    break;
            }
            return icon;
        },
        handleSelectionAttach: function(oEvent){
            sap.ui.core.BusyIndicator.show();
            var dataRow = oEvent.getSource().getBindingContext("ListAttachModel").getObject();
            var dtValue = new Date();
            var fileName = "Document_" + String(dtValue.getDate()) + String(dtValue.getMonth()+1) + String(dtValue.getFullYear()) + String(dtValue.getHours()) + String(dtValue.getMinutes());
            this.downloadFile(dataRow.File, fileName, dataRow.ObjType)
            sap.ui.core.BusyIndicator.hide();
        },
        handleSelectionViewOrder:function(oEvent){
            sap.ui.core.BusyIndicator.show();
            var dataRow = oEvent.getSource().getBindingContext("ListOrderModel").getObject();
            var dtValue = new Date();
            var fileName = "Orden_" + dataRow.Ebeln;
            this.onViewerPDF(dataRow.File,fileName)
            sap.ui.core.BusyIndicator.hide();
        },
        onViewerPDF: function(pdf, namePdf) {
            var objbuilder;

            objbuilder += ('<object width="100%" height="100%" data="data:application/pdf;base64,');
            objbuilder += (pdf);
            objbuilder += ('" type="application/pdf" class="internal">');
            objbuilder += ('<embed src="data:application/pdf;base64,');
            objbuilder += (pdf);
            objbuilder += ('" type="application/pdf" />');
            objbuilder += ('</object>');

            var win = window.open("#", "_blank");
            var title = namePdf

            win.document.write('<html><title>' + title +
                '</title><body style="margin-top:0px; margin-left: 0px; margin-right: 0px; margin-bottom: 0px;">');
            win.document.write(objbuilder);
            win.document.write('</body></html>');
        },
        downloadFile: function (data, nombre, type) {
			//data = Xstring del servicio que contienen el pdf
			var element = document.createElement('a');
            var objectType = this.getMimeType(type)
			element.setAttribute('href', 'data:'+ objectType +';base64,' + data);
			element.setAttribute('download', (nombre ? nombre : "Documento"));
			element.style.display = 'none';
			document.body.appendChild(element);
			element.click();
			document.body.removeChild(element)
		},
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
                default:
                    objType = "application/pdf";
                    break;
            }
            return objType    
        },
        onPressAction: function(option){
            var itemselected =this.byId("list").getSelectedItems();
            if(itemselected.length === 0){
                MessageToast.show("Seleccione  una solicitud de pedido");
                return;
            }
            var title=option=== 1? "Aprovar Solicitud": "Rechazar Solicitud"
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
							text: "¿Desea "+ title+"?",
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
							var sText = Core.byId("submissionNote").getValue();
							//MessageToast.show("Comentario es: " + sText);
                            this.onSendDialogApprobe(option)
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
        onSendDialogApprobe: function(option){
            var that = this;
            var title = option === 1? "Solicitud Aprobada": "Solicitud Rechazada"
            sap.ui.core.BusyIndicator.show();
            var orderdata = this.getView().getModel("orderModel").getData();
            var WiId = orderdata.wi_id;
            var ebln=orderdata.ebeln;
            var genericModel = this.getView().getModel("modelattach");
            var user = this.UserID ==="DEFAULT_USER" || this.UserID ==="" ? "EXT_OMAR" :  this.UserID ;
            var entidad = "/release_poSet(WiId='"+WiId+"',Uname='"+ user +"',Ebeln='"+ ebln +"',Approved="+option+")";            
            genericModel.read(entidad, {
                success: function(oData, response) {
                    sap.ui.core.BusyIndicator.hide();
                    var data = response.data
                    
                        MessageBox.success("la operación se realizó con exito", {
                            icon: MessageBox.Icon.SUCCESS,
                            title: title,
                            onClose: function(){
                                that.onGetInitialData();
                                var ordermodel = that.getView().getModel("orderModel");
                                ordermodel.setData({modelData:{}});
                                ordermodel.updateBindings(true);
                                var modeldetail = that.getView().getModel("ListdetailModel");
                                modeldetail.setData({modelData:{}});
                                modeldetail.updateBindings(true);
                                var tab = that.getView().byId("iconTabBar").getSelectedKey()
                                if(tab==="attach") that.getView().byId("iconTabBar").setSelectedKey("Items");
                            }
                        });
                },
                error: function(oData, response) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error al ejecutar la operación");
                }
            });
        }
    });
});
