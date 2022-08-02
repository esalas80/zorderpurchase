sap.ui.define(["sap/uxap/BlockBase"], function (BlockBase) {
	"use strict";
	return BlockBase.extend("gm.zorderpurchase.view.blocks.BlockPaymentCondition", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "gm.zorderpurchase.view.blocks.BlockPaymentCondition",
					type: "XML"
				},
				Expanded: {
					viewName: "gm.zorderpurchase.view.blocks.BlockPaymentCondition",
					type: "XML"
				}
			}
		}
	});
});
