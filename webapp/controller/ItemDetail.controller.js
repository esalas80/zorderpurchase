sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/core/Core",
], function(
	BaseController, JSONModel, History, formatter, Core) {
	"use strict";    
	return BaseController.extend("gm.zorderpurchase.controller.ItemDetail", {
        formatter: formatter,

        onInit : function () {
            var oViewModel = new JSONModel({
                busy : true,
                delay : 0
            });
            this.getRouter().getRoute("itemDetail").attachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("itemDetail").attachPatternMatched(this._onPatternMatch, this);
            this.setModel(oViewModel, "objectView");
		},
        _onPatternMatch: function (oEvent) {
			this._supplier = oEvent.getParameter("arguments").supplier || this._supplier || "0";
			this._product = oEvent.getParameter("arguments").product || this._product || "0";

		},
       /* This is a function that is called when the route is matched. */
        _onObjectMatched : function (oEvent) {
            
            var argument =  oEvent.getParameter("arguments");
            this._sObjectId=argument.objectId  || this._sObjectId || "0"; 
            this._itemId=argument.itemId || this._itemId || "0"; 
            if(this.getModel("appView").getProperty("/layout")!=="EndColumnFullScreen"){
                this.getModel("appView").setProperty("/layout","ThreeColumnsEndExpanded")
            }
            this.loadDetail(this._sObjectId);
        },

        /* Loading the data from the model and setting it to the view. */
        loadDetail:function(){
            var that = this;
            var oViewModel = this.getModel("objectView");
            oViewModel.setProperty("/busy", false);
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var itemList = sap.ui.getCore().getModel("OderDetail").getData();
            var dataSelectedOrder = sap.ui.getCore().getModel("selectedOrder").getData();
            var dataHeaderDetail = sap.ui.getCore().getModel("selectedOrderHeader").getData();
            itemList.Waers = dataSelectedOrder.Waers;
            oViewModel.setData(itemList);
            this.byId("pageTitle").setText(i18n.getText("expandTitle", [itemList.ebeln, itemList.txz01]))
            this.byId("snappedTitle").setText(i18n.getText("expandTitle", [itemList.ebeln, itemList.txz01]))
            var auxModel = new sap.ui.model.json.JSONModel(itemList);
            this.getView().setModel(auxModel,"ItemDetail");
            var orderModel = new sap.ui.model.json.JSONModel(dataSelectedOrder);
            var headerOrderModel = new sap.ui.model.json.JSONModel(dataHeaderDetail);
            this.setModel(orderModel,"orderModel")
            this.setModel(headerOrderModel,"headerOrderModel")
            
        },
        onExit: function () {
			this.getRouter().getRoute("itemDetail").detachPatternMatched(this._onPatternMatch, this);
		},
        handleFullScreen: function () {
			var e=this.getModel("appView").getProperty("/actionButtonsInfo/endColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/endColumn/fullScreen",!e);
            if(!e){
                this.getModel("appView").setProperty("/previousLayout",this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout","EndColumnFullScreen")
            }else{
                this.getModel("appView").setProperty("/layout",this.getModel("appView").getProperty("/previousLayout"))
            }
		},

		handleExitFullScreen: function () {
			this.getRouter().navTo("itemDetail", {objectId:this._sObjectId,itemId: this._itemId});
		},

		handleClose: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/endColumn/fullScreen",false);
            this.getRouter().navTo("object", {objectId:this._sObjectId});
		},

	});
});