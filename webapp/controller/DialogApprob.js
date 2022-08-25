sap.ui.define([
	"./BaseController",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/core/routing/History"
], function(BaseController, MessageBox, Utilities, Fragment, History, Edit) {

	return BaseController.extend("gm.zorderpurchase.controller.DialogApprob", {
	// return BaseController.extend("GASS.zcashclose.controller.DialogCloseCash", {
		constructor: function(oView) {
			this._oView = oView;
			this._oControl = sap.ui.xmlfragment(oView.getId(), "gm.zorderpurchase.view.DialogApprob", this);
			this._bInit = false;
		},

		exit: function() {
			delete this._oView;
		},

		

		getControl: function() {
			return this._oControl;
		},

		getOwnerComponent: function() {
			return this._oView.getController().getOwnerComponent();
		},

		open: function() {
			var oView = this._oView;
			var oControl = this._oControl;
			if (!this._bInit) {

				// Initialize our fragment
				this.onInit();

				this._bInit = true;

				// connect fragment to the root view of this component (models, lifecycle)
				oView.addDependent(oControl);
			}

			var args = Array.prototype.slice.call(arguments);
			if (oControl.open) {
				oControl.open.apply(oControl, args);
			} else if (oControl.openBy) {
				oControl.openBy.apply(oControl, args);
			}
           
		},

		close: function() {
			this._oControl.close();
		},

		setRouter: function(oRouter) {
			this.oRouter = oRouter;

		},
		getBindingParameters: function() {
			return {};

		},
		_onButtonPress: function() {
            this._oView.getController().getRouter().navTo("cobranza");
			this.close();
		},
	
		onInit: function() {
			this._oDialog = this.getControl();
		},
		onExit: function() {
			this._oDialog.destroy();

		},
        onLiveTextChange: function(oEvent){
            this.convertToUpper(oEvent);
        },
		
        
	});
}, /* bExport= */ true);