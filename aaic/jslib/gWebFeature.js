gEcnu.WebFeatureServices = gClass.extend({
    init: function() {},
});
/**
 * 地图工具 进行点查、矩形查询、多边形查询等（图查属性）
 */
gEcnu.QueryType = {};
gEcnu.QueryType.Point = "point_qry";
gEcnu.QueryType.Line = "line_qry";
gEcnu.QueryType.Polygon = "polygon_qry";
gEcnu.QueryType.Rect = "rect_qry";
gEcnu.layerType = {};
gEcnu.layerType.Esri = "shp";
gEcnu.layerType.GeoDB = "geodb";
gEcnu.WebFeatureServices.QueryByGeometry = gEcnu.WebFeatureServices.extend({
    init: function(eventsListener) {
        if (typeof eventsListener != "undefined") {
            this.events._events.processCompleted = eventsListener.processCompleted;
            this.events._events.processFailed = eventsListener.processFailed;
        }
    },
    processAscyn: function(geometry, lyrType, map, lyr, tolerance, shapeFlag_bool, returnFields) {
        var webfeatureUrl = gEcnu.config.geoserver + "WebFeature";
        var shapeFlag=0;
        if (shapeFlag_bool) {
            shapeFlag = 1;
        } else {
            shapeFlag = 0;
        }
        if (geometry instanceof gEcnu.Geometry.Point) {
            //TODO  执行点选查询
            var pointParams = {};
            if (lyrType == "geodb") {
                pointParams = {
                    "mt": "SeachAt",
                    "geoDB": map,
                    "ftSet": lyr,
                    "Point": {
                        "x": geometry.x,
                        "y": geometry.y
                    },
                    "Err": tolerance,
                    "return": {
                        "shape": shapeFlag,
                        "fields": returnFields
                    }
                }
            } else if (lyrType == "shp") {
                pointParams = {
                    "mt": "SeachAt",
                    "map": map,
                    "lyr": lyr,
                    "Point": {
                        "x": geometry.x,
                        "y": geometry.y
                    },
                    "Err": tolerance,
                    "return": {
                        "shape": shapeFlag,
                        "fields": returnFields
                    }
                }
            }
            var datastr = JSON.stringify(pointParams);
            var params = {
                req: datastr
            };
        } else if ((geometry instanceof gEcnu.Geometry.LineString) && geometry.className == "line") {
        }else if ((geometry instanceof gEcnu.Geometry.LinearRing) && geometry.className == "polygon") {
            var polygonParams = {};
            var qry_Polygon = new gEcnu.Feature.Polygon([geometry], {});
            var opeShape = qry_Polygon.shape;
            if (lyrType == "geodb") {
                polygonParams = {
                    "mt": "SelectByShape",
                    "geoDB": map,
                    "ftSet": lyr,
                    "shape": opeShape,
                    "sMode": 0,
                    "return": {
                        "shape": shapeFlag,
                        "fields": returnFields
                    }
                }
            } else if (lyrType == "shp") {
                polygonParams = {
                    "mt": "SelectByShape",
                    "map": map,
                    "lyr": lyr,
                    "shape": opeShape,
                    "sMode": 0,
                    "return": {
                        "shape": shapeFlag,
                        "fields": returnFields
                    }
                }
            }
            var datastr = JSON.stringify(polygonParams);
            var params = {
                req: datastr
            };
        }else if((geometry instanceof gEcnu.Geometry.RectRing) && geometry.className == "rect"){
            var rectParams = {};
            var shpBox=gEcnu.Util.getShpBox(geometry.points);
            if (lyrType == "geodb") {
                rectParams = {
                  "mt":"SelectByRect",
                  "geoDB":map,
                  "ftSet":lyr,
                  "rect":{"xmin":shpBox[0],"ymin":shpBox[1],"xmax":shpBox[2],"ymax":shpBox[3]},
                  "return":{"shape":shapeFlag,"fields":returnFields}
                }
            } else if (lyrType == "shp") {
                rectParams = {
                  "mt":"SelectByRect",
                  "map":map,
                  "lyr":lyr,
                  "rect":{"xmin":shpBox[0],"ymin":shpBox[1],"xmax":shpBox[2],"ymax":shpBox[3]},
                  "return":{"shape":shapeFlag,"fields":returnFields}
                }
            }
            var datastr = JSON.stringify(rectParams);
            var params = {
                req: datastr
            };
        }else if((geometry instanceof gEcnu.Geometry.RadiusRing) && geometry.className == "radius"){
            var radiusParams = {};
            if (lyrType == "geodb") {
                radiusParams = {
                  "mt":"SelectByRadius",
                  "geoDB":map,
                  "ftSet":lyr,
                  "Point":{"x":geometry.centerPoint.x,"y":geometry.centerPoint.y},
                  "R":geometry.radius,
                  "return":{"shape":shapeFlag,"fields":returnFields}
                }
            } else if (lyrType == "shp") {
                radiusParams = {
                  "mt":"SelectByRadius",
                  "map":map,
                  "lyr":lyr,
                  "Point":{"x":geometry.centerPoint.x,"y":geometry.centerPoint.y},
                  "R":geometry.radius,
                  "return":{"shape":shapeFlag,"fields":returnFields}
                }
            }
            var datastr = JSON.stringify(radiusParams);
            var params = {
                req: datastr
            };
        }
        var webfeaServices = this;
        var events_data_suc=webfeaServices.events._events.processCompleted;
        var events_data_fail=webfeaServices.events._events.processFailed;
        //gEcnu.webfeaServicesCase[id_num_data]=events_data;
        try {
            gEcnu.Util.ajax("POST", webfeatureUrl, params, true, function(data,process_res) {
                //console.log('完成');
                var sucCompleted=process_res['suc'];
                var jsonparase = JSON.parse(data);
                var returnFeatures = [];
                returnFeatures = jsonparase.Features;
                if (returnFeatures.length == 0) {
                    //TODO直接调用回调函数
                    if (typeof(sucCompleted) != "undefined") {
                        sucCompleted(returnFeatures);
                    }
                } else {
                    //TODO此时说明有返回要素
                    if (shapeFlag == 1) {
                        var resultFeatures = [];
                        for (var fetureNum = 0; fetureNum < returnFeatures.length; fetureNum++) {
                            //TODO  此时返回fetures要素
                            var returnFeature = returnFeatures[fetureNum];
                            var returnFeatureType = returnFeature.shape.shpType;
                            if (returnFeatureType == 5) {
                                //说明返回的是多边形要素
                                var shpParts = returnFeature.shape.Parts;
                                var Parts_len = shpParts.length;
                                var shpPoints = returnFeature.shape.Points;
                                var lineRings = [];
                                for (var j = 0; j < Parts_len; j++) {
                                    var begin_Index = shpParts[j];
                                    if (j == (Parts_len - 1)) {
                                        var next_Index = shpPoints.length;
                                    } else {
                                        var next_Index = shpParts[j + 1];
                                    }
                                    var lineRing_Points = [];
                                    for (var k = begin_Index; k < (next_Index - 1); k++) {
                                        var geometry_point = new gEcnu.Geometry.Point(shpPoints[k].X, shpPoints[k].Y);
                                        lineRing_Points.push(geometry_point);
                                    }
                                    var tmpLineRing = new gEcnu.Geometry.LinearRing(lineRing_Points);
                                    lineRings.push(tmpLineRing);
                                }
                                var shpfields = returnFeature.fields;
                                var feature_Attr = {};
                                if (typeof shpfields != "undefined") {
                                    var shpfields_len = shpfields.length;
                                    for (var kk = 0; kk < shpfields_len; kk++) {
                                        var tmpfield = shpfields[kk];
                                        for (m in tmpfield) {
                                            feature_Attr[m] = tmpfield[m];
                                        }
                                    }
                                }
                                feature_Attr.FID = returnFeature.FID;
                                var tmpFeature = new gEcnu.Feature.Polygon(lineRings, feature_Attr);
                                resultFeatures.push(tmpFeature);
                            } else if (returnFeatureType == 3) {
                                //说明返回的是线要素
                                var shpParts = returnFeature.shape.Parts;
                                var Parts_len = shpParts.length;
                                var shpPoints = returnFeature.shape.Points;
                                var lineStrings = [];
                                for (var j = 0; j < Parts_len; j++) {
                                    var begin_Index = shpParts[j];
                                    if (j == (Parts_len - 1)) {
                                        var next_Index = shpPoints.length;
                                    } else {
                                        var next_Index = shpParts[j + 1];
                                    }
                                    var lineString_Points = [];
                                    for (var k = begin_Index; k < next_Index; k++) {
                                        var geometry_point = new gEcnu.Geometry.Point(shpPoints[k].X, shpPoints[k].Y);
                                        lineString_Points.push(geometry_point);
                                    }
                                    var tmpLineString = new gEcnu.Geometry.LineString(lineString_Points);
                                    lineStrings.push(tmpLineString);
                                }
                                var shpfields = returnFeature.fields;
                                var feature_Attr = {};
                                if (typeof shpfields != "undefined") {
                                    var shpfields_len = shpfields.length;
                                    for (var kk = 0; kk < shpfields_len; kk++) {
                                        var tmpfield = shpfields[kk];
                                        for (m in tmpfield) {
                                            feature_Attr[m] = tmpfield[m];
                                        }
                                    }
                                }
                                feature_Attr.FID = returnFeature.FID;
                                var tmpFeature = new gEcnu.Feature.Polyline(lineStrings, feature_Attr);
                                resultFeatures.push(tmpFeature);
                            } else {
                                //说明返回的是点要素
                                var shpPoints = returnFeature.shape.Points;
                                var geometrys = [];
                                for (var j = 0; j < shpPoints.length; j++) {
                                    var geometry_point = new gEcnu.Geometry.Point(shpPoints[j].X, shpPoints[j].Y);
                                    geometrys.push(geometry_point);
                                }
                                var shpfields = returnFeature.fields;
                                var feature_Attr = {};
                                if (typeof shpfields != "undefined") {
                                    var shpfields_len = shpfields.length;
                                    for (var kk = 0; kk < shpfields_len; kk++) {
                                        var tmpfield = shpfields[kk];
                                        for (m in tmpfield) {
                                            feature_Attr[m] = tmpfield[m];
                                        }
                                    }
                                }
                                feature_Attr.FID = returnFeature.FID;
                                var tmpFeature = new gEcnu.Feature.Point(geometrys, feature_Attr);
                                resultFeatures.push(tmpFeature);
                            }
                        }
                        if (typeof(sucCompleted) != "undefined") {
                            sucCompleted(resultFeatures);
                        }
                    } else if (shapeFlag == 0) {
                        //此时只是返回属性信息
                        var resultFeatures = [];
                        for (var fetureNum = 0; fetureNum < returnFeatures.length; fetureNum++) {
                            //TODO  此时返回fetures要素
                            var returnFeature = returnFeatures[fetureNum];
                            //var returnFeatureType=returnFeature.shape.shpType;
                            var shpfields = returnFeature.fields;
                            var feature_Attr = {};
                            if (typeof shpfields != "undefined") {
                                var shpfields_len = shpfields.length;
                                for (var kk = 0; kk < shpfields_len; kk++) {
                                    var tmpfield = shpfields[kk];
                                    for (m in tmpfield) {
                                        feature_Attr[m] = tmpfield[m];
                                    }
                                }
                            }
                            feature_Attr.FID = returnFeature.FID;
                            feature_Attr.cx = returnFeature.cx;
                            feature_Attr.cy = returnFeature.cy;
                            resultFeatures.push(feature_Attr);
                        }
                        if (typeof(sucCompleted) != "undefined") {
                            sucCompleted(resultFeatures);
                        }
                    }
                }
            }, function() {
                alert('webfeature请求超时');
            }, 50000,{'suc':events_data_suc,'fail':events_data_fail});
        } catch (e) {
            if (typeof(events_data_fail) != "undefined") {
                events_data_fail(e);
            }
        }
    },
    events: {
        _events: {},
        on: function(eventType, callback) {
            switch (eventType) {
                case 'processCompleted':
                    this._events.processCompleted = callback;
                    break;
                case 'processFailed':
                    this._events.processFailed = callback;
                    break;
            }
        }
    }
    
});
/**
 * 进行要素查询（属性查图）
 */
gEcnu.WebFeatureServices.QueryBySQL = gEcnu.WebFeatureServices.extend({
    init: function(eventsListener) {
        if (typeof eventsListener != "undefined") {
            this.events._events.processCompleted = eventsListener.processCompleted;
            this.events._events.processFailed = eventsListener.processFailed;
        }
    },
    processAscyn: function(sql, lyrType, map, lyr,shapeFlag_bool, returnFields) {
        var webfeatureUrl = gEcnu.config.geoserver +"WebFeature";
         var shapeFlag=0;
        if (shapeFlag_bool) {
            shapeFlag = 1;
        } else {
            shapeFlag = 0;
        }
        //TODO  执行点选查询
        var sqlParams = {};
        if (lyrType == "geodb") {
            sqlParams = {
                "mt":"SQLQuery",
                "geoDB":map,
                "ftSet":lyr,
                "sql":sql,
                "return":{"shape":shapeFlag,"fields":returnFields}
            }
        } else if (lyrType == "shp") {
            alert('暂时不支持shp图层查询');return;
            sqlParams = {
                "mt":"SQLQuery",
                "map":map,
                "lyr":lyr,
                "sql":sql,
                "return":{"shape":shapeFlag,"fields":returnFields}
            }
        }
        var datastr = JSON.stringify(sqlParams);
        var params = {
            req: datastr
        };
        var webfeaServices = this;
        var events_data_suc=webfeaServices.events._events.processCompleted;
        var events_data_fail=webfeaServices.events._events.processFailed;
        try {
            gEcnu.Util.ajax("POST", webfeatureUrl, params, true, function(data,process_res) {
                 var sucCompleted=process_res['suc']; 
                var jsonparase = JSON.parse(data);   
                var returnFeatures = [];               
                returnFeatures = jsonparase.Features;
                if (returnFeatures.length == 0) {
                    //TODO直接调用回调函数
                    if (typeof(sucCompleted) != "undefined") {
                        sucCompleted(returnFeatures);
                    }
                } else {
                    //TODO此时说明有返回要素
                    if (shapeFlag == 1) {
                        var resultFeatures = [];
                        for (var fetureNum = 0; fetureNum < returnFeatures.length; fetureNum++) {
                            var iferror=false;
                            //TODO  此时返回fetures要素
                            var returnFeature = returnFeatures[fetureNum];
                            var returnFeatureType = returnFeature.shape.shpType;
                            if (returnFeatureType == 5) {
                                //说明返回的是多边形要素
                                var shpParts = returnFeature.shape.Parts;
                                var Parts_len = shpParts.length;
                                var shpPoints = returnFeature.shape.Points;
                                var lineRings = [];
                                for (var j = 0; j < Parts_len; j++) {
                                    var begin_Index = shpParts[j];
                                    if (j == (Parts_len - 1)) {
                                        var next_Index = shpPoints.length;
                                    } else {
                                        var next_Index = shpParts[j + 1];
                                    }
                                    var lineRing_Points = [];
                                    for (var k = begin_Index; k < (next_Index - 1); k++) {
                                        var geometry_point = new gEcnu.Geometry.Point(shpPoints[k].X, shpPoints[k].Y);
                                        lineRing_Points.push(geometry_point);
                                    }
                                    var tmpLineRing = new gEcnu.Geometry.LinearRing(lineRing_Points);
                                    if(tmpLineRing.className=="polygon"){
                                      lineRings.push(tmpLineRing);
                                    }else{
                                       iferror=true;
                                       break;
                                    }
                                }
                                if(iferror){
                                    continue;
                                }
                                var shpfields = returnFeature.fields;
                                var feature_Attr = {};
                                if (typeof shpfields != "undefined") {
                                    var shpfields_len = shpfields.length;
                                    for (var kk = 0; kk < shpfields_len; kk++) {
                                        var tmpfield = shpfields[kk];
                                        for (m in tmpfield) {
                                            feature_Attr[m] = tmpfield[m];
                                        }
                                    }
                                }
                                feature_Attr.FID = returnFeature.FID;
                                var tmpFeature = new gEcnu.Feature.Polygon(lineRings, feature_Attr);
                                resultFeatures.push(tmpFeature);
                            } else if (returnFeatureType == 3) {  
                                //说明返回的是线要素
                                var shpParts = returnFeature.shape.Parts;
                                var Parts_len = shpParts.length;
                                var shpPoints = returnFeature.shape.Points;
                                var lineStrings = [];
                                for (var j = 0; j < Parts_len; j++) {
                                    var begin_Index = shpParts[j];
                                    if (j == (Parts_len - 1)) {
                                        var next_Index = shpPoints.length;
                                    } else {
                                        var next_Index = shpParts[j + 1];
                                    }
                                    var lineString_Points = [];
                                    for (var k = begin_Index; k < next_Index; k++) {
                                        var geometry_point = new gEcnu.Geometry.Point(shpPoints[k].X, shpPoints[k].Y);
                                        lineString_Points.push(geometry_point);
                                    }
                                   

                                    var tmpLineString =new gEcnu.Geometry.LineString(lineString_Points);
                                    lineStrings.push(tmpLineString); 
                                }
                                
                                var shpfields = returnFeature.fields;
                                var feature_Attr = {};
                                if (typeof shpfields != "undefined") {
                                    var shpfields_len = shpfields.length;
                                    for (var kk = 0; kk < shpfields_len; kk++) {
                                        var tmpfield = shpfields[kk];
                                        for (m in tmpfield) {
                                            feature_Attr[m] = tmpfield[m];
                                        }
                                    }
                                }
                                feature_Attr.FID = returnFeature.FID;
                                var tmpFeature = new gEcnu.Feature.Polyline(lineStrings, feature_Attr);
                          
                                resultFeatures.push(tmpFeature);
                            } else {
                                //说明返回的是点要素
                                var shpPoints = returnFeature.shape.Points;
                                var geometrys = [];  
                                for (var j = 0; j < shpPoints.length; j++) {
                                    
                                    var geometry_point = new gEcnu.Geometry.Point(shpPoints[j].X, shpPoints[j].Y);
                                    geometrys.push(geometry_point);
                                }
                                var shpfields = returnFeature.fields;
                                var feature_Attr = {};
                                if (typeof shpfields != "undefined") {
                                    var shpfields_len = shpfields.length;
                                    for (var kk = 0; kk < shpfields_len; kk++) {
                                        var tmpfield = shpfields[kk];
                                        for (m in tmpfield) {
                                            feature_Attr[m] = tmpfield[m];
                                        }
                                    }
                                }
                                feature_Attr.FID = returnFeature.FID;
                                var tmpFeature = new gEcnu.Feature.Point(geometrys, feature_Attr);
                                resultFeatures.push(tmpFeature);
                            }
                        }
                        if (typeof(sucCompleted) != "undefined") {
                            sucCompleted(resultFeatures);
                        }
                    } else if (shapeFlag == 0) {
                        //此时只是返回属性信息
                        var resultFeatures = [];
                        for (var fetureNum = 0; fetureNum < returnFeatures.length; fetureNum++) {
                            //TODO  此时返回fetures要素
                            var returnFeature = returnFeatures[fetureNum];
                            //var returnFeatureType=returnFeature.shape.shpType;
                            var shpfields = returnFeature.fields;
                            var feature_Attr = {};
                            if (typeof shpfields != "undefined") {
                                var shpfields_len = shpfields.length;
                                for (var kk = 0; kk < shpfields_len; kk++) {
                                    var tmpfield = shpfields[kk];
                                    for (m in tmpfield) {
                                        feature_Attr[m] = tmpfield[m];
                                    }
                                }
                            }
                            feature_Attr.FID = returnFeature.FID;
                            feature_Attr.cx = returnFeature.cx;
                            feature_Attr.cy = returnFeature.cy;
                            resultFeatures.push(feature_Attr);
                        }
                        if (typeof(sucCompleted) != "undefined") {
                            sucCompleted(resultFeatures);
                        }
                    }
                }
            }, function() {
                alert('webfeature请求超时');
            }, 500000,{'suc':events_data_suc,'fail':events_data_fail});
        } catch (e) {
            if (typeof(events_data_fail) != "undefined") {
                events_data_fail(e);
            }
        }
    },
    events: {
        _events: {},
        on: function(eventType, callback) {
            switch (eventType) {
                case 'processCompleted':
                    this._events.processCompleted = callback;
                    break;
                case 'processFailed':
                    this._events.processFailed = callback;
                    break;
            }
        }
    }
});
/**
 * 进行要素增删改操作（ADD,DELETE,UPDATE,SQLTask等批量操作）
 */
gEcnu.ActType = {};
gEcnu.ActType.ADD = "ADD";
gEcnu.ActType.DELETE = "DELETE";
gEcnu.ActType.UPDATE = "UPDATE";
gEcnu.ActType.SQLTask = "SQLTask";
gEcnu.WebFeatureServices.FeatureServices = gEcnu.WebFeatureServices.extend({
    init: function(eventsListener) {
        if (typeof eventsListener != "undefined") {
            this.events._events.processCompleted = eventsListener.processCompleted;
            this.events._events.processFailed = eventsListener.processFailed;
        }
    },
    processAscyn: function(ActionType,lyrType,map,lyrOrSQLTask,featuresOrSQL){
        var webfeatureUrl = gEcnu.config.geoserver + "WebFeature";
        if(ActionType=="ADD"){
            var addParams = {};
            var featuresOrSQL_len=featuresOrSQL.length;
            var addFeatures=[];
            for(var i=0;i<featuresOrSQL_len;i++){
                var tmpAddfea={};
                tmpAddfea.shape=featuresOrSQL[i].shape;
                //tmpAddfea.fields=featuresOrSQL[i].fields;
                tmpAddfea.fields=[];
                var feaFields=featuresOrSQL[i].fields;

                for (var kk in feaFields){
                    var str={};
                    str[kk]=escape(feaFields[kk]);
                    tmpAddfea.fields.push(str);
                }

                addFeatures.push(tmpAddfea);
            }
            if (lyrType == "geodb") {
                addParams = {
                    "mt":"SQLInsert",
                    "geoDB":map,
                    "ftSet":lyrOrSQLTask,
                    "features":addFeatures
                }
            } else if (lyrType == "shp") {
                addParams = {
                    "mt":"SQLInsert",
                    "map":map,
                    "lyr":lyrOrSQLTask,
                    "features":addFeatures
                }
            }
            var datastr = JSON.stringify(addParams);
            var params = {
                req: datastr
            };
        }else if(ActionType=="DELETE"){
            var delParams = {};
            if (lyrType == "geodb") {
                delParams = {
                    "mt":"SQLDelete",
                    "geoDB":map,
                    "ftSet":lyrOrSQLTask,
                    "sql":featuresOrSQL
                }
            } else if (lyrType == "shp") {
                delParams = {
                    "mt":"SQLDelete",
                    "map":map,
                    "lyr":lyrOrSQLTask,
                    "sql":featuresOrSQL
                }
            }
            var datastr = JSON.stringify(delParams);
            var params = {
                req: datastr
            };
        }else if(ActionType=="UPDATE"){
            var updateParams = {};
            var featuresOrSQL_len=featuresOrSQL.length;
            var updateFeatures=[];
            for(var i=0;i<featuresOrSQL_len;i++){
                var tmpUpdatefea={};
                tmpUpdatefea.FID=featuresOrSQL[i].FID;
                if(featuresOrSQL[i].UPDATE=="SHP"){//只更新图形信息
                   tmpUpdatefea.shape=featuresOrSQL[i].Feature.shape;
               }else if(featuresOrSQL[i].UPDATE=="FIELDS"){//只更新字段信息
                    tmpUpdatefea.fields=[];
                    var feaFields=featuresOrSQL[i].Feature.fields;

                    for (var kk in feaFields){
                        var str={};
                        str[kk]=escape(feaFields[kk]);
                        tmpUpdatefea.fields.push(str);
                    }

                }else{//全部更新信息
                    tmpUpdatefea.shape=featuresOrSQL[i].Feature.shape; 
                    tmpUpdatefea.fields=[];
                    var feaFields=featuresOrSQL[i].Feature.fields;

                    for (var kk in feaFields){
                        var str={};
                        str[kk]=escape(feaFields[kk]);
                        tmpUpdatefea.fields.push(str);
                    }

                }
                updateFeatures.push(tmpUpdatefea);
            }
            if (lyrType == "geodb") {
                updateParams = {
                    "mt":"SQLUpdate",
                    "geoDB":map,
                    "ftSet":lyrOrSQLTask,
                    "features":updateFeatures
                }
            } else if (lyrType == "shp") {
                updateParams = {
                    "mt":"SQLUpdate",
                    "map":map,
                    "lyr":lyrOrSQLTask,
                    "features":updateFeatures
                }
            }
            var datastr = JSON.stringify(updateParams);
            var params = {
                req: datastr
            };
        }else if(ActionType=="SQLTask"){
            var sqltaskParams = {};
            if (lyrType == "geodb") {
                sqltaskParams = {
                    "mt":"SQLTask",
                    "geoDB":map,
                    "task":lyrOrSQLTask
                }
            } else if (lyrType == "shp") {
                alert('对不起，暂时不支持shp图层批量操作！');
                sqltaskParams = {
                    "mt":"SQLTask",
                    "map":map,
                    "task":lyrOrSQLTask
                }
            }
            var datastr = JSON.stringify(sqltaskParams);
            var params = {
                req: datastr
            };
        }
        var webfeaServices = this;
        try {
            gEcnu.Util.ajax("POST", webfeatureUrl, params, true, function(data){
                if (typeof(webfeaServices.events._events.processCompleted) != "undefined") {
                    webfeaServices.events._events.processCompleted();
                }
            },function() {
                alert('webfeature请求超时');
            },500000);
        }catch (e) {
            if (typeof(webfeaServices.events._events.processFailed) != "undefined") {
                webfeaServices.events._events.processFailed(e);
            }
        }
    },
    events: {
        _events: {},
        on: function(eventType, callback) {
            switch (eventType) {
                case 'processCompleted':
                    this._events.processCompleted = callback;
                    break;
                case 'processFailed':
                    this._events.processFailed = callback;
                    break;
            }
        }
    }
});
gEcnu.WebFeatureServices.SQLTasks = gEcnu.WebFeatureServices.extend({
    init:function(ActionType,lyrType,lyr,featuresOrSQL){
        if(ActionType=="ADD"){
            var addParams = {};
            var featuresOrSQL_len=featuresOrSQL.length;
            var addFeatures=[];
            for(var i=0;i<featuresOrSQL_len;i++){
                var tmpAddfea={};
                tmpAddfea.shape=featuresOrSQL[i].shape;
                //tmpAddfea.fields=featuresOrSQL[i].fields;
                tmpAddfea.fields=[];
                var feaFields=featuresOrSQL[i].fields;
 
                for (var kk in feaFields){
                    var str={};
                    //str[kk]=escape(tmpfield[kk]);
                    str[kk]=(feaFields[kk]);
                    tmpAddfea.fields.push(str);
                }

                addFeatures.push(tmpAddfea);
            }
            if (lyrType == "geodb") {
                addParams = {
                    "mt":"SQLInsert",
                    "ftSet":lyr,
                    "features":addFeatures
                }
            } else if (lyrType == "shp") {
                addParams = {
                    "mt":"SQLInsert",
                    "lyr":lyr,
                    "features":addFeatures
                }
            }
            //return addParams;
             this.taskParams=addParams;     
        }else if(ActionType=="DELETE"){
            var delParams = {};
            if (lyrType == "geodb") {
                delParams = {
                    "mt":"SQLDelete",
                    "ftSet":lyr,
                    "sql":featuresOrSQL
                }
            } else if (lyrType == "shp") {
                delParams = {
                    "mt":"SQLDelete",
                    "lyr":lyr,
                    "sql":featuresOrSQL
                }
            }
            //return delParams;
            this.taskParams=delParams;
        }else if(ActionType=="UPDATE"){
            var updateParams = {};
            var featuresOrSQL_len=featuresOrSQL.length;
            var updateFeatures=[];
            for(var i=0;i<featuresOrSQL_len;i++){
                var tmpUpdatefea={};
                tmpUpdatefea.FID=featuresOrSQL[i].FID;
                if(featuresOrSQL[i].UPDATE=="SHP"){//只更新图形信息
                   tmpUpdatefea.shape=featuresOrSQL[i].Feature.shape;
               }else if(featuresOrSQL[i].UPDATE=="FIELDS"){//只更新字段信息
                    tmpUpdatefea.fields=[];
                    var feaFields=featuresOrSQL[i].Feature.fields;
     
                    for (var kk in feaFields){
                        var str={};
                        //str[kk]=escape(feaFields[kk]);
                        str[kk]=feaFields[kk];
                        tmpUpdatefea.fields.push(str);
                    }

                }else{//全部更新信息
                   tmpUpdatefea.shape=featuresOrSQL[i].Feature.shape; 
                   tmpUpdatefea.fields=[];
                    var feaFields=featuresOrSQL[i].Feature.fields;
  
                    for (var kk in feaFields){
                        var str={};
                        //str[kk]=escape(feaFields[kk]);
                        str[kk]=feaFields[kk];
                        tmpUpdatefea.fields.push(str);
                    }

                }
                updateFeatures.push(tmpUpdatefea);
            }
            if (lyrType == "geodb") {
                updateParams = {
                    "mt":"SQLUpdate",
                    "ftSet":lyr,
                    "features":updateFeatures
                }
            } else if (lyrType == "shp") {
                updateParams = {
                    "mt":"SQLUpdate",
                    "lyr":lyr,
                    "features":updateFeatures
                }
            }
            this.taskParams=updateParams;
        }
    }
});



//创建要素图层

gEcnu.FtSetParams={};
gEcnu.FtSetParams.PUBLICDB="publicdb";  //用户自定义要素图层所在的数据库
gEcnu.FtSetParams.FIELDMETEDATA="fieldinfo"; //字段元数据表
gEcnu.FtSetParams.FEATURESETLIST="ftSetList"; //要素信息列表表
/**
 * 创建要素
 * 同时在要素列表中追加关于要素信息的记录  字段信息元数据表(此处实现依赖webSQL接口，也可使用原始方法以解除依赖)
 */
gEcnu.WebFeatureServices.createFeatureSet=gEcnu.WebFeatureServices.extend({
    /**
     * 初始化
     * @param  {[type]} ftsetName      要素名
     * @param  {[type]} fieldArr       要素的属性字段
     * @param  {[type]} viewExtent     要素图层的范围
     * @param  {[type]} coordsys       要素的坐标系统
     * @param  {[type]} fieldArr       要素的坐标系统
     * @param {[type]} callback        成功时的回调函数
     * @return {[type]}               [description]
     */
    init:function (ftsetName,shpType,viewExtent,coordsys,fieldArr,callback){   
        this.ftsetName=ftsetName;
        this.shpType=shpType;
        this.viewExtent=viewExtent;
        this.coordSystem=coordsys;
        this.fields=[];
        this.fields=this.fields.concat(fieldArr);  
        this._callback=callback;  
        this._createFtset();
    },
    /**
     * 创建要素表
     * @return {[type]} 
     */
    _createFtset:function (){
        var _self=this;
        var tableName="f_"+this.ftsetName; 
        var ftService_exec=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (msg){  alert("创建要素表成功"); 
            _self._addftsetRecord();
        },'processFailed':function (){ }});  
        var sql="create table if not exists "+tableName+" (FID integer PRIMARY KEY,shpType integer,xmin double,ymin double,xmax double,ymax double,shpLen double,shpArea double,shpData blob,V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15)";  //主键为整型时 默认自动增长
        ftService_exec.processAscyn(gEcnu.ActType.SQLEXEC,gEcnu.FtSetParams.PUBLICDB,sql);
    },
    /**
     * 向要素列表中追加该要素的记录
     */
    _addftsetRecord:function (){
        var _self=this;
        var ftsetName=this.ftsetName;
        var shpType=this.shpType;
        var viewExtent=this.viewExtent;
        var coordsys=this.coordSystem;
        var inserService=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (msg){ 
           alert("添加要素列表记录成功");
           _self._addFieldinfoRecord();
        },'processFailed':function (){ }});   
        var params={'Fields':['ftsetName','shptype','viewextent','coordsys','datasource'],'Data':[[ftsetName,shpType,viewExtent,coordsys,ftsetName]]};
        inserService.processAscyn(gEcnu.ActType.ADD,gEcnu.FtSetParams.PUBLICDB,gEcnu.FtSetParams.FEATURESETLIST,params);
    },
    /**
     * 向字段元数据表中添加记录
     * @param {[array]} fieldArr 字段数组
     */
    _addFieldinfoRecord:function (){
        var fields=[];
        var tmpfieldArr=this.fields;
        fields=fields.concat(tmpfieldArr);
        var tabname="f_"+this.ftsetName;
        var dataArr=[]; 
        var callback=this._callback;
        if(fields.length<1){
        if(callback!=undefined){ callback();} 
            return;
        }
        for(var i=0,len=fields.length;i<len;i++){    
            var tmpobj=fields[i];  //{'field':'name','fieldType':'text'}
            var fieldname=tmpobj.field;
            var fieldType=tmpobj.fieldType;
            var field="V"+i;
            var tmparr=[field,tabname,fieldname,fieldType];
            dataArr.push(tmparr);
        }
        var addService=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (msg){ 
           alert("向字段元数据表中添加记录成功");
           if(callback!=undefined){ callback();} 
        },'processFailed':function (){ }});
        var params={'Fields':['field','tabname','fieldRealname','fieldtype'],'Data':dataArr};
        console.log('addfield',params);
        addService.processAscyn(gEcnu.ActType.ADD,gEcnu.FtSetParams.PUBLICDB,gEcnu.FtSetParams.FIELDMETEDATA,params);
    }

});

/**
 *  * 属性编辑（添加字段、删除字段,修改样式、标注及标注样式设置）
 * @param  {[string]} ftset                                
 */
gEcnu.WebFeatureServices.editFeatureSet=gEcnu.WebFeatureServices.extend({
    init:function (ftsetName){
        this.ftsetName=ftsetName;
    },
    /**
     * 给要素添加属性字段 主要是向fieldinfo表追加记录
     * @param {[Array]} fieldArr 字段信息,数组形式如[{'field':'name','fieldType':'text'},{}]
     */
    addFields:function (fieldArr){  //{'field':'name','fieldType':'text'} 
    var ftsetName=this.ftsetName;
    var ftsetTab="f_"+ftsetName;
    var queryService=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (data){ 
           var len=data.length;
           var lastfld=data[len-1].field;//最后一个字段的序号 Vi
           endfldindex=parseInt(lastfld.substring(1))+1;  console.log(endfldindex);
           var dataArr=[];
           for(var i=0,fieldArr_len=fieldArr.length;i<fieldArr_len;i++){
            var tmpobj=fieldArr[i];  //{'field':'name','fieldType':'text'}
            var fieldname=tmpobj.field;
            var fieldType=tmpobj.fieldType;
            var index=endfldindex+i;
            var field="V"+index;
            var tmparr=[field,ftsetTab,fieldname,fieldType];
            dataArr.push(tmparr);
           }
           var addService=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (msg){ 
            alert("添加字段成功");
          },'processFailed':function (){ }});
         var params={'Fields':['field','tabname','fieldRealname','fieldtype'],'Data':dataArr};
         console.log('addfield',params);
         addService.processAscyn(gEcnu.ActType.ADD,gEcnu.FtSetParams.PUBLICDB,gEcnu.FtSetParams.FIELDMETEDATA,params);
         },'processFailed':function (){ }});
    var params={'lyr':gEcnu.FtSetParams.FIELDMETEDATA,'fields':'field','filter':'tabname='+"'"+ftsetTab+"'"};
    queryService.processAscyn(gEcnu.ActType.SQLQUERY,gEcnu.FtSetParams.PUBLICDB,params);
    },
    /**
     * 删除要素中的字段 操作字段元数据表fieldinfo
     * @param  {[type]} fields 待删除的字段数组
     * @return {[type]}        [description]
     */
    deleteFields:function (fields){  //['name','objId'] 
    var ftsetTab="f_"+this.ftsetName;
    var execService=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (msg){ 
            alert("删除字段成功");
          },'processFailed':function (){ }});
    var filter=""; 
    var len=fields.length;
    for(var i=0;i<len;i++){
        if(i<len-1){
            filter=filter+"fieldRealname="+"'"+fields[i]+"'"+" or ";
        }else{
            filter=filter+"fieldRealname="+"'"+fields[i]+"'";
        }
    }
    filter="("+filter+")";
    var sql="delete from "+gEcnu.FtSetParams.FIELDMETEDATA+" where "+filter+" and tabname="+"'"+ftsetTab+"'";  console.log(sql);
    execService.processAscyn(gEcnu.ActType.SQLEXEC,gEcnu.FtSetParams.PUBLICDB,sql);
    }
    
    });

/**
 * 新建地图 地图名不能重复（检查）
 */
gEcnu.WebFeatureServices.createMap=gEcnu.WebFeatureServices.extend({
    /**
     * 初始化
     * @param  {[type]}   mapname   地图名称
     * @param  {[type]}   mapalias  地图别名
     * @param  {[type]}   ftsets    地图下的图层要素数组['landuse','line'];
     * @param  {[type]}   mapcoords 坐标系统
     * @param  {[type]}   mapextent 地图范围
     * @param  {Function} callback  成功时的回调
     * @return {[type]}             [description]
     */
    init:function (mapname,mapalias,ftsets,mapcoords,mapextent,callback){
        this.mapName=mapname;
        this.mapAlias=mapalias;
        this.ftSets=ftsets;  
        this.mapCoords=mapcoords;
        this.mapExtent=mapextent;
        this._callback=callback;
        this._checkMapExist();
        //this._getMapId(); 
    },
    /**
     * 检查数据库中是否有该地图
     * @return {[type]} [description]
     */
    _checkMapExist:function (){
        var mapname=this.mapName;
        var _self=this;
        var sqlService_qryid=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (result){  console.log(result);
        //var name=result[0]['map_name'];   
        if(result.length>0){ alert("已经存在该地图，请更换地图名"); return;  }     
        _self._getMapId();
        },'processFailed':function (){}});
        var params={'lyr':'g_map','fields':'map_name','filter':'map_name='+"'"+mapname+"'"};
        sqlService_qryid.processAscyn(gEcnu.ActType.SQLQUERY,gEcnu.FtSetParams.PUBLICDB,params);
    },

    /**
     * 获取新建地图的id
     */
    _getMapId:function (){
        var _self=this;
        var sqlService_qryid=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (result){  
        var mapId=result[0]['max(map_id)'];  
        if(mapId=='null'){ mapId=0;  } 
        mapId=parseInt(mapId)+1;
        _self._addMapRecord(mapId);
        },'processFailed':function (){}});
        var params={'lyr':'g_map','fields':'max(map_id)','filter':''};
        sqlService_qryid.processAscyn(gEcnu.ActType.SQLQUERY,gEcnu.FtSetParams.PUBLICDB,params);
    },
    /**
     * 向g_map中追加记录
     */
    _addMapRecord:function (mapId){
        var _self=this;
        var sqlService_add=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (msg){
            alert("添加g_map记录成功");
            _self._getLyrFieldsByName(mapId);
        },'processFailed':function (){ }});
        var mapName=this.mapName;
        var mapAlias=this.mapAlias;
        var mapExtent=this.mapExtent;
        var mapCoords=this.mapCoords;
        var params={'Fields':['map_name','map_alias','ViewExtent','coordsys'],'Data':[[mapName,mapAlias,mapExtent,mapCoords]]};
        sqlService_add.processAscyn(gEcnu.ActType.ADD,gEcnu.FtSetParams.PUBLICDB,'g_map',params);
    },
    /**
     * 通过图层名获取图层字段值（shptype datasource）
     * @return {[type]} [description]
     */
    _getLyrFieldsByName:function (mapId){
        var _self=this;
        var layersInfo=[]; //存储查询结果
        var layerArr=[];
        layerArr=layerArr.concat(this.ftSets); console.log();
        var i=0;
        var len=layerArr.length;

        (function getFieldsValue(){
            if(i<len){
            var sqlService=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (result){  
            layersInfo=layersInfo.concat(result);
            i++;
            getFieldsValue();
            },'processFailed':function (){}});
           var params={'lyr':gEcnu.FtSetParams.FEATURESETLIST,'fields':'shptype,datasource','filter':'ftsetName='+"'"+layerArr[i]+"'"};
           sqlService.processAscyn(gEcnu.ActType.SQLQUERY,gEcnu.FtSetParams.PUBLICDB,params);
         }else{
            if(i==len){  
                _self._addLayerRecord(mapId,layersInfo);  //图层信息获取完毕，开始添加记录   
            }
         }
        }());

       // getFieldsValue();
    },
    /**
     * 向g_layers中添加记录
     */
    _addLayerRecord: function(mapId,layersInfo){
        var _self=this;
        var callback=this._callback;
        var sqlService_insert=new gEcnu.WebSQLServices.SQLServices({'processCompleted':function (msg){
            alert('添加g_layers记录成功');
            if(callback!=undefined){
                callback();  //执行回调
            }    
        },'processFailed':function (){ }});
        var layerArr=[];
        layerArr=layerArr.concat(this.ftSets); 
        //其他字段暂未处理 都为空; 'selectble','autolabel',labelfield'zoomlayer' lyr_flag数据库有默认值
        var LYR_STYLE="0,$00006432,1,0,$00006432";
        var LABEL_STYLE='134,宋体,0,-14,0';
        var dataArr=[];  console.log(layerArr);
        for(var i=0,len=layerArr.length;i<len;i++){console.log(i,len);  
            var tmparr=[];
            var lyrname=layerArr[i];
            tmparr[0]=lyrname;
            tmparr[1]=layersInfo[i].shptype; console.log(i,layersInfo[i]);
            tmparr[2]=mapId;
            tmparr[3]=lyrname;
            tmparr[4]=layersInfo[i].datasource;  //类似data\road.shp 
            //tmparr[4]=escape(layersInfo[i].datasource);
            tmparr[5]=LABEL_STYLE;
            tmparr[6]=LYR_STYLE;
            dataArr.push(tmparr);
        }
        var params={'Fields':['lyr_name','lyr_type','map_id','alias','datasource','labelstyle','lyr_style'],'Data':dataArr};
        sqlService_insert.processAscyn(gEcnu.ActType.ADD,gEcnu.FtSetParams.PUBLICDB,'g_layers',params);
    } 
});

/**
 * 编辑地图里各图层样式（标注及标注样式，图层样式）
 */
