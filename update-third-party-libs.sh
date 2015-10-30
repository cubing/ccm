# We pass -N to wget to ensure that it clobbers existing files.
#  http://serverfault.com/a/379060

(cd client/components/; wget -N http://twitter.github.io/typeahead.js/releases/latest/typeahead.bundle.js)
(cd css/components/; wget -N https://raw.githubusercontent.com/bassjobsen/typeahead.js-bootstrap-css/master/typeaheadjs.import.less)

(cd client/components/; wget -N https://github.com/arshaw/fullcalendar/raw/master/dist/fullcalendar.js)
(cd css/components/; wget -N https://github.com/arshaw/fullcalendar/raw/master/dist/fullcalendar.import.less)

(cd client/components/; wget -N https://raw.githubusercontent.com/jonthornton/jquery-timepicker/master/jquery.timepicker.js)
(cd css/components/; wget -N https://raw.githubusercontent.com/jonthornton/jquery-timepicker/master/jquery.timepicker.import.less)

(cd client/components/; wget -N https://raw.githubusercontent.com/jmosbech/StickyTableHeaders/master/js/jquery.stickytableheaders.js)

(cd both/lib/; wget -N http://www.jflei.com/jChester/jChester.js)

(cd css/components/; wget -N https://raw.githubusercontent.com/cubing/icons/master/cubing-icons.import.less)

(cd both/lib/; curl -s https://raw.githubusercontent.com/OpenBookPrices/country-data/master/data/countries.json | sed -e '1s/^/JSON.stringify(/' -e '$a\,function(k,v){return k!=="name"&&k!=="alpha2"&&isNaN(k)?undefined:v},2)' | node -p | sed -e '1s/^/countries = /' -e '$a\;' > countries.js)

(cd both/lib/; wget -N https://cdnjs.cloudflare.com/ajax/libs/jstimezonedetect/1.0.4/jstz.js)

# Custom build of jquery-ui that includes only the stuff we need
#  http://jqueryui.com/download/#!version=1.11.2&components=1110110000000000000000000000000000000
(cd client/components/; curl 'http://download.jqueryui.com/download' --data 'version=1.11.2&core=on&widget=on&mouse=on&draggable=on&droppable=on&theme=ffDefault%3DTrebuchet%2520MS%252CTahoma%252CVerdana%252CArial%252Csans-serif%26fwDefault%3Dbold%26fsDefault%3D1.1em%26cornerRadius%3D4px%26bgColorHeader%3Df6a828%26bgTextureHeader%3Dgloss_wave%26bgImgOpacityHeader%3D35%26borderColorHeader%3De78f08%26fcHeader%3Dffffff%26iconColorHeader%3Dffffff%26bgColorContent%3Deeeeee%26bgTextureContent%3Dhighlight_soft%26bgImgOpacityContent%3D100%26borderColorContent%3Ddddddd%26fcContent%3D333333%26iconColorContent%3D222222%26bgColorDefault%3Df6f6f6%26bgTextureDefault%3Dglass%26bgImgOpacityDefault%3D100%26borderColorDefault%3Dcccccc%26fcDefault%3D1c94c4%26iconColorDefault%3Def8c08%26bgColorHover%3Dfdf5ce%26bgTextureHover%3Dglass%26bgImgOpacityHover%3D100%26borderColorHover%3Dfbcb09%26fcHover%3Dc77405%26iconColorHover%3Def8c08%26bgColorActive%3Dffffff%26bgTextureActive%3Dglass%26bgImgOpacityActive%3D65%26borderColorActive%3Dfbd850%26fcActive%3Deb8f00%26iconColorActive%3Def8c08%26bgColorHighlight%3Dffe45c%26bgTextureHighlight%3Dhighlight_soft%26bgImgOpacityHighlight%3D75%26borderColorHighlight%3Dfed22f%26fcHighlight%3D363636%26iconColorHighlight%3D228ef1%26bgColorError%3Db81900%26bgTextureError%3Ddiagonals_thick%26bgImgOpacityError%3D18%26borderColorError%3Dcd0a0a%26fcError%3Dffffff%26iconColorError%3Dffd27a%26bgColorOverlay%3D666666%26bgTextureOverlay%3Ddiagonals_thick%26bgImgOpacityOverlay%3D20%26opacityOverlay%3D50%26bgColorShadow%3D000000%26bgTextureShadow%3Dflat%26bgImgOpacityShadow%3D10%26opacityShadow%3D20%26thicknessShadow%3D5px%26offsetTopShadow%3D-5px%26offsetLeftShadow%3D-5px%26cornerRadiusShadow%3D5px&theme-folder-name=ui-lightness&scope=' | bsdtar -xvf- -O jquery-ui-1.11.2.custom/jquery-ui.js > jquery-ui.js)

(cd client/components/; wget -N https://raw.githubusercontent.com/cubing/worldcubeassociation.org/master/WcaOnRails/app/assets/javascripts/users-autocomplete.js)
(cd client/components/; wget -N https://raw.githubusercontent.com/cubing/worldcubeassociation.org/master/WcaOnRails/app/assets/javascripts/selectize.do_not_clear_on_blur.js)
