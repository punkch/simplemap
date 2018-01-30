/* globals google, $ */

import { loadGoogleAPI, loadMapsApi } from "./Helpers";

class SimpleMapSettings {
	
	// Variables
	// =========================================================================
	
	namespacedId = null;
	mapSettings = {
		lat: 51.272154,
		lng: 0.514951,
		zoom: 15,
		height: 400,
		boundary: {
			nw: { lat: 0, lng: 0 },
			se: { lat: 0, lng: 0 },
		}
	};
	
	setup = false;
	inputs = null;
	
	settingsMap = null;
	settingsMapEl = null;
	settingsMapWrap = null;
	
	boundaryMap = null;
	
	mouseMoveLastPos = 0;
	nextHeight = 0;
	
	// SimpleMapSettings
	// =========================================================================
	
	constructor (key, locale, namespacedId, mapSettings) {
		this.namespacedId = namespacedId;
		this.mapSettings = Object.keys(mapSettings).reduce((a, b) => {
			a[b] = +mapSettings[b];
			return a;
		}, {});
		
		this.inputs = {
			lat: document.getElementById(`${this.namespacedId}lat`),
			lng: document.getElementById(`${this.namespacedId}lng`),
			zoom: document.getElementById(`${this.namespacedId}zoom`),
			height: document.getElementById(`${this.namespacedId}height`),
		};
		
		// Load Google APIs if they aren"t already
		if (typeof google === "undefined") {
			if (!window.simpleMapsLoadingGoogle)
				loadGoogleAPI(key, locale);
		} else if (!google.maps || !google.maps.places) {
			// Load Google Maps APIs if the aren"t already
			if (!window.simpleMapsLoadingGoogle)
				loadMapsApi(key, locale);
		} else {
			if (!this.setup)
				this.setupMaps();
		}
		
		document.addEventListener("SimpleMapsGAPILoaded", () => {
			if (!this.setup)
				this.setupMaps();
		});
		
		// Re-draw the maps when the type select changes
		// (otherwise the maps will be grey)
		document.getElementById("type").addEventListener("change", e => {
			if (e.target.value === "ether\\simplemap\\fields\\MapField")
				this.redrawMaps();
		});
		
		$(`#${this.namespacedId}hideMap`).on("change", this.onHideMapToggle);
	}
	
	// Events
	// =========================================================================
	
	// Events: Settings Map
	// -------------------------------------------------------------------------
	
	onHideMapToggle = e => {
		const shouldHide = !!e.target.getElementsByTagName("input")[0].value;
		
		if (shouldHide) {
			const nextMaxHeight =
				this.settingsMapWrap.getBoundingClientRect().height + "px";
			
			if (nextMaxHeight !== 0)
				this.settingsMapWrap.style.maxHeight = nextMaxHeight;
		}
		
		setTimeout(() => {
			this.settingsMapWrap
				.classList[shouldHide ? "add" : "remove"]("hide");
		}, 1);
	};
	
	onSettingsMapReposition = () => {
		this.inputs.lng.value = this.settingsMap.center.lng();
		this.inputs.lat.value = this.settingsMap.center.lat();
	};
	
	onSettingsMapZoom = () => {
		this.inputs.zoom.value = this.settingsMap.getZoom();
	};
	
	onResizeMouseDown = e => {
		e.preventDefault();
		
		this.mouseMoveLastPos = e.clientY;
		this.nextHeight = this.mapSettings.height;
		
		this.settingsMapEl.style.pointerEvents = "none";
		this.settingsMapWrap.style.maxHeight = '';
		
		document.addEventListener("mousemove", this.onResizeMouseMove);
		document.addEventListener("mouseup", this.onResizeMouseUp);
	};
	
	onResizeMouseMove = e => {
		this.nextHeight = this.nextHeight + (e.clientY - this.mouseMoveLastPos);
		this.mouseMoveLastPos = e.clientY;
		
		if (this.nextHeight < 250)
			return;
		
		requestAnimationFrame(() => {
			this.mapSettings.height = this.nextHeight;
			this.inputs.height.value = this.nextHeight;
			this.settingsMapEl.style.height = `${this.nextHeight}px`;
			
			const c = this.settingsMap.getCenter();
			
			google.maps.event.trigger(this.settingsMap, "resize");
			this.settingsMap.setCenter(c);
		});
	};
	
	onResizeMouseUp = () => {
		this.settingsMapEl.style.pointerEvents = "";
		document.removeEventListener("mousemove", this.onResizeMouseMove);
		document.removeEventListener("mouseup", this.onResizeMouseUp);
	};
	
	// Actions
	// =========================================================================
	
	setupMaps () {
		
		this.setup = true;
		
		// Settings Map
		// ---------------------------------------------------------------------
		
		this.settingsMapEl =
			document.getElementById(`${this.namespacedId}settingsMap`);
		this.settingsMapWrap =
			document.getElementById(`${this.namespacedId}settingsMapWrap`);
		
		this.settingsMap = new google.maps.Map(this.settingsMapEl, {
			zoom: this.mapSettings.zoom,
			center: new google.maps.LatLng(
				this.mapSettings.lat,
				this.mapSettings.lng
			),
			scrollwheel: false,
			fullscreenControl: false,
			mapTypeControl: false,
			streetViewControl: false,
			rotateControl: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
		});
		
		google.maps.event.addListener(
			this.settingsMap,
			'dragend',
			this.onSettingsMapReposition
		);
		
		google.maps.event.addListener(
			this.settingsMap,
			'zoom_changed',
			this.onSettingsMapZoom
		);
		
		// Resizer
		document.getElementById(`${this.namespacedId}settingsMapHeight`)
		        .addEventListener("mousedown", this.onResizeMouseDown);
		
		// Boundary Map
		// ---------------------------------------------------------------------
		
		const boundaryMapEl =
			document.getElementById(`${this.namespacedId}boundaryMap`);
		
		// TODO: If we have boundaries, position the map to contain them.
		// TODO: Add [Clear] button
		
		this.boundaryMap = new google.maps.Map(boundaryMapEl, {
			zoom: this.mapSettings.zoom,
			center: new google.maps.LatLng(
				this.mapSettings.lat,
				this.mapSettings.lng
			),
			scrollwheel: false,
			fullscreenControl: false,
			mapTypeControl: false,
			streetViewControl: false,
			rotateControl: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
		});
		
	}
	
	redrawMaps () {
		const xa = this.settingsMap.getZoom()
			, ca = this.settingsMap.getCenter()
			, xb = this.boundaryMap.getZoom()
			, cb = this.boundaryMap.getCenter();
		
		setTimeout(() => {
			google.maps.event.trigger(this.settingsMap, 'resize');
			this.settingsMap.setZoom(xa);
			this.settingsMap.setCenter(ca);
			
			google.maps.event.trigger(this.boundaryMap, 'resize');
			this.boundaryMap.setZoom(xb);
			this.boundaryMap.setCenter(cb);
		}, 1);
	}
	
}

window.SimpleMapSettings = SimpleMapSettings;