sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("gm.zorderpurchase.controller.App", {

        onInit : function () {
            var e,n,o=this.getView().getBusyIndicatorDelay();
            e=new JSONModel({
                busy:true,
                delay:0,
                layout:"OneColumn",
                previousLayout:"",
                actionButtonsInfo:
                {
                    midColumn:{
                    fullScreen:false
                    },
                    endColumn:{
                        fullScreen:false
                    }
                }   
            });
            this.setModel(e,"appView");
            n=function(){
                e.setProperty("/busy",false);
                e.setProperty("/delay",o)
            };
            this.getOwnerComponent().getModel().metadataLoaded().then(n);
            this.getOwnerComponent().getModel().attachMetadataFailed(n);
            // apply content density mode to root view
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
        }
    });

});