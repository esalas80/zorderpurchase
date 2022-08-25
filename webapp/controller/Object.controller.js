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
        loadDetail: function(detailId){
            var that = this;
            var i18n = this.getView().getModel("i18n").getResourceBundle();
            var oViewModel = this.getModel("objectView");
            oViewModel.setProperty("/busy", false);
            var dataDetail = sap.ui.getCore().getModel("OderDetail").getData();
            var dataSelectedOrder = sap.ui.getCore().getModel("selectedOrder").getData();
            var dataHeaderDetail = sap.ui.getCore().getModel("selectedOrderHeader").getData();
            
            // this.byId("pageTitle").setText(i18n.getText("expandTitle", [dataDetail.ebeln, dataDetail.txz01]))
            // this.byId("snappedTitle").setText(i18n.getText("expandTitle", [dataDetail.ebeln, dataDetail.txz01]))
            oViewModel.setData(dataDetail);
            var orderModel = new sap.ui.model.json.JSONModel(dataSelectedOrder);
            var headerOrderModel = new sap.ui.model.json.JSONModel(dataHeaderDetail);
            this.setModel(orderModel,"orderModel")
            this.setModel(headerOrderModel,"headerOrderModel")
            
        }

    });

});
