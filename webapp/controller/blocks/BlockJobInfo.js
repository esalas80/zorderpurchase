sap.ui.define(["sap/uxap/BlockBase"], function (BlockBase) {
	"use strict";
	return BlockBase.extend("gm.zorderpurchase.view.blocks.BlockJobInfo", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "gm.zorderpurchase.view.blocks.BlockJobInfo",
					type: "XML"
				},
				Expanded: {
					viewName: "gm.zorderpurchase.view.blocks.BlockJobInfo",
					type: "XML"
				}
			}
		}
	});
});
