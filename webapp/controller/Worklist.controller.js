sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Core",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    'sap/m/MessageToast',
    "sap/ui/Device"
], function (BaseController, JSONModel, Core, formatter, MessageBox, Fragment, Filter, sorter, FilterOperator, Dialog, MessageToast, Device) {
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
            var eList = this.byId("list"),
                t=this._createViewModel(),
                i=eList.getBusyIndicatorDelay();
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
            var oDeviceModel = new JSONModel(Device);
			oDeviceModel.setDefaultBindingMode("OneWay");
			this.getView().setModel(oDeviceModel, "device");
            this.setModel(t,"masterView");
            eList.attachEventOnce("updateFinished",function(){
                t.setProperty("/delay",i)
            });
            this.getView().addEventDelegate({
                onBeforeFirstShow:function(){
                    this.getOwnerComponent().oListSelector.setBoundMasterList(eList)
                }.bind(this)
            });
            this.getRouter().getRoute("worklist").attachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("worklist").attachPatternMatched(this._onMasterMatched,this);
            this.getRouter().attachBypassed(this.onBypassed,this);
        },
        /* The above code is reading data from a CDS view and then setting the data to a JSON model. */
        /**
         * @date 2022-11-28
         * @returns {any}
         */
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
            await detallePromise.then(function(resp){
                sap.ui.core.BusyIndicator.hide();
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
        _onMasterMatched:function(){
            this.getModel("appView").setProperty("/layout","OneColumn")
        },
        _onObjectMatched: function () {
            this.onGetInitialData(); 
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
       /* Getting the selected item from the list and then getting the data from the backend. */
        /**
         * @date 2022-11-28
         * @param {any} oEvent
         * @returns {any}
         */
        onSelectionChange:async  function (oEvent) {
            
            sap.ui.core.BusyIndicator.show()
            var t=oEvent.getSource(),
                i=oEvent.getParameter("selected");
            var object =oEvent.getSource().getSelectedItem().getBindingContext("ListModel").getObject();
            var nroOrden = object.ebeln;
            var modelo = this.getGenericModel();
            var entidad = "/ZMM_CDS_OC('"+object.ebeln+"')/to_position";
            var detailData; 
            await this.getEntityV2(modelo,entidad,"").then(value=>{
                detailData = value;
            }).catch((e)=>{
                sap.ui.core.BusyIndicator.hide();    
            });
            var dataHeader;
            await this.getEntityV2(modelo, "/ZMM_CDS_OC('"+object.ebeln+"')","").then(value =>{
                dataHeader = value;
            }).catch((e)=>{
                sap.ui.core.BusyIndicator.hide();    
            });
            var arrfechas=[];
            detailData.results.forEach(element => {
                arrfechas.push(element.eindt) 
            });
            var highestDate= new Date(Math.max.apply(null,arrfechas));
            var minimumdate = new Date(Math.min.apply(null,arrfechas));
            object.deliveryDate=highestDate
            var auxModelHeader = new sap.ui.model.json.JSONModel(dataHeader);
            var auxModel = new sap.ui.model.json.JSONModel(detailData.results);
            var orderModel = new sap.ui.model.json.JSONModel(object);
            this.getView().setModel(auxModel,"ListdetailModel");
            this.getView().setModel(auxModelHeader,"HeaderdetailModel");
            this.getView().setModel(orderModel,"orderModel");
            sap.ui.getCore().setModel(orderModel,"selectedOrder");
            sap.ui.getCore().setModel(auxModelHeader,"selectedOrderHeader");
            sap.ui.getCore().setModel(auxModel,"ListdetailModel");
            if(!(t.getMode()==="MultiSelect"&&!i)){
                this._showDetail(nroOrden)
            }    
            sap.ui.core.BusyIndicator.hide();    
        },
        /* Reading the data from the backend and setting it to the model. */
        /**
         * @date 2022-11-28
         * @param {any} oEvent
         * @returns {any}
         */
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

        _createViewModel:function(){
            return new JSONModel({
                isFilterBarVisible:false,
                filterBarLabel:"",
                delay:0,
                titleCount:0,
                noDataText:this.getResourceBundle().getText("masterListNoDataText")
            })
        },

        /* A function that is called when the user clicks on a list item. */
        /**
         * @date 2022-11-28
         * @param {any} e
         * @returns {any}
         */
        _showDetail:function(e){
            var t=!Device.system.phone;
            this.getModel("appView").setProperty("/layout","TwoColumnsMidExpanded");
            this.getRouter().navTo("object",{objectId:e},t)
        }
    });
});
