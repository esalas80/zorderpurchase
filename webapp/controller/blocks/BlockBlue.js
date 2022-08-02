sap.ui.define(['sap/uxap/BlockBase'], function (BlockBase) {
	"use strict";
	return BlockBase.extend("gm.zorderpurchase.view.blocks.BlockBlue", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "gm.zorderpurchase.view.blocks.BlockBlue",
					type: "XML"
				},
				Expanded: {
					viewName: "gm.zorderpurchase.view.blocks.BlockBlue",
					type: "XML"
				}
			}
		}
	});
});
