require('../css/styles.css');
require('../assets/boostrap-table/bootstrap-table.min.css');

const jq = require('jquery');

//bootstrap table requires jquery to be in the global scope
if (window.$ === undefined && minerva.$ !== undefined) {
    window.$ = window.jQuery = window.jquery = minerva.$;
}

// require('bootstrap-table');
// boostrap-table is required directly because when using via npm, the boostrapTable is for unknown reason not added to the $ object when deployed on minerva-dev
require('../assets/boostrap-table/bootstrap-table.min');

const pluginName = 'adr';
const pluginLabel = 'Drug reactions';
const pluginVersion = '1.0.0';
const containerName = pluginName + '-container';

const settings = {
    drugColumnName: 'Drug',
    typeColumnName: 'Type',
    reactionColumnName: 'Reaction',
    dataSource: 'https://raw.githubusercontent.com/davidhoksza/drug-reactions-data/master/FinalReferenceStandard200LabelsTrimmed.csv'
};

const globals = {
    adrData: {},
    adrDataMap: {},
    drugs2BioEntities: {},
    bioentities2Drugs: {},
    idModelId2BioEntity: {}
};

// ******************************************************************************
// ********************* PLUGIN REGISTRATION WITH MINERVA *********************
// ******************************************************************************

let $container;
let $adrTable;
let minervaProxy;
let pluginContainer;
let pluginContainerId;
let selectedInMap = undefined;


const register = function(_minerva) {

    // console.log('registering ' + pluginName + ' plugin');

    $(".tab-content").css('position', 'relative');

    minervaProxy = _minerva;
    pluginContainer = $(minervaProxy.element);
    pluginContainerId = pluginContainer.attr('id');

    // console.log('minerva object ', minervaProxy);
    // console.log('project id: ', minervaProxy.project.data.getProjectId());
    // console.log('model id: ', minervaProxy.project.data.getModels()[0].modelId);

    initPlugin();
};

const unregister = function () {
    // console.log('unregistering ' + pluginName + ' plugin');

    unregisterListeners();
    return deHighlightAll();
};

const getName = function() {
    return pluginLabel;
};

const getVersion = function() {
    return pluginVersion;
};

/**
 * Function provided by Minerva to register the plugin
 */
minervaDefine(function (){
    return {
        register: register,
        unregister: unregister,
        getName: getName,
        getVersion: getVersion
        ,minWidth: 300
        ,defaultWidth: 600
    }
});

function initPlugin () {
    registerListeners();
    const $container = initMainContainer();
    $container.data("minervaProxy", minervaProxy);
    initDrugBioEntities().then(function(){
        $container.find('.drugs-loading').hide();
        initMainPageStructure($container);
        initAdrTable($container);
    });
}

function registerListeners(){
    minervaProxy.project.map.addListener({
        dbOverlayName: "search",
        type: "onSearch",
        callback: searchListener
    });
}

function unregisterListeners() {
    minervaProxy.project.map.removeAllListeners();
}

// ****************************************************************************
// ********************* MINERVA INTERACTION*********************
// ****************************************************************************


function deHighlightAll(){
    return minervaProxy.project.map.getHighlightedBioEntities().then( highlighted => minervaProxy.project.map.hideBioEntity(highlighted) );
}

// ****************************************************************************
// ********************* PLUGIN STRUCTURE AND INTERACTION*********************
// ****************************************************************************

function getContainerClass() {
    return containerName;
}

function initMainContainer(){
    $container = $(`<div class="${getContainerClass()}"></div>`).appendTo(pluginContainer);
    $container.append(`
        <div class="modal fade">
            <div class="modal-dialog">
                <div class="modal-content border-danger">
                    <div class="modal-header bg-danger text-light">                        
                            <h4 class="modal-title">Error</h4>
                            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Loading the dataset from <i>${settings.dataSource}</i> failed.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div> 
            
        <div class="panel card panel-default drugs-loading">
            <div class="panel-body card-body">  
                <i class="fa fa-circle-o-notch fa-spin"></i> Obtaining drug-bioentities mapping. This might take several minutes
                if this is the first time the plugin is loaded for this map ...
            </div>        
        </div>
    `);

    return $container;
}

function initMainPageStructure(container){

    container.append(`
        
        <table class="adr-table"></table>
        
        <div class="panel card panel-warning border-warning error-panel d-none hidden">
            <div class="panel-heading card-header bg-warning"> No mapping found </div>
            <div class="panel-body m-3">
                Either the elements in the map are not targeted by any drug in the source 
                <a href="https://bionlp.nlm.nih.gov/tac2017adversereactions/" target="_blank">data set</a> 
                or the respective elements are not annotated by HGNC.                         
            </div>
        </div>
    `);

    // container.find('.btn-search').on('click', () => search() );
    // container.find('.input-disease').keypress(e => {if (e.which == 13) {search(); return false}} );
}

function initAdrTable($container) {
    if (globals.adrDataMap.length === 0){
        $container.find('.error-panel').removeClass('hidden');
        $container.find('.error-panel').removeClass('d-none');
        return;
    }

    $adrTable = $container.find('.adr-table');
    $adrTable.bootstrapTable({
        columns: [{
            field: 'State',
            sortable: true
        },{
            field: 'Drug',
            title: 'Drug',
            sortable: true,
            searchable: true
            // filter: {
            //     type: "input"
            // }
        },{
            field: 'Type',
            title: 'Type',
            sortable: true,
            searchable: true
            // filter: {
            //     type: "select",
            //     data: ["", "ADVERSE REACTIONS"]
            // }
        },{
            field: 'Reaction',
            title: 'Drug reaction',
            searchable: true
            // filter: {
            //     type: "select",
            //     data: []
            // }
        },{
            field: 'Entity',
            title: 'Entity',
            searchable: true
            // filter: {
            //     type: "select",
            //     data: []
            // }
        }, {
            field: 'EntityId',
            title: 'EntityId',
            searchable: false
        }],
        // filter: true,
        // filterTemplate: {
        //     input: function(bootstrapTable, column, isVisible) {
        //         return '<input type="text" class="form-control input-sm" data-filter-field="' + column.field + '" style="width: 100%; visibility:' + isVisible + '">';
        //     }
        // },
        search:true,
        data: globals.adrDataMap.map(d => Object.assign({}, {State:1}, d)),
        sortName: 'Drug',
        sortOrder: 'asc',
        rowStyle: function (row, index){
            return row['State'] === 0 ? {classes: 'danger'} : {};
        },
        onSearch: function (text){
            highlightInMap($adrTable);
            //highlightSelectedInTable();
        },
        onPostBody: function (data) {
            $container.find('table td:first-child, table th:first-child').css('display', 'none');
            $container.find('table td:last-child, table th:last-child').css('display', 'none');
            //highlightSelectedInTable();
        }
    });


    highlightInMap($adrTable);

    // setTableHeight(adrTable);
    // activateSearchBtton(false);

    // registerTableEvents();
}

function highlightInMap($adrTable){
    const data = $adrTable.bootstrapTable('getData');
    const drugNames = uniquify(data.map(d => d[settings.drugColumnName]));
    let bioEntities = drugNames
        .map(dn => globals.drugs2BioEntities[dn])
        .reduce((acc, val) => acc.concat(val), []);
    bioEntities = uniquifyBioentities(bioEntities);

    return deHighlightAll().then(function () {
        let highlightDefs = bioEntities.map(e => {
            return {
                element: {
                    id: e.id,
                    modelId: e.modelId,
                    type: e.type
                },
                type: "ICON"
            };
        });
        return minervaProxy.project.map.showBioEntity(highlightDefs);
    });
}

// function recreateBootstrapTable(){
//     pluginContainer.find('.bootstrap-table').remove();
//     $('<table class="variation-table"></table>').appendTo(pluginContainer.find(`.${getContainerClass()}`));
//
// }

function parseAdrCsv(csv) {

    const names = [];
    const data = [];

    const drugTypeIx = {};

    csv.split(/\r?\n/).forEach((line, i) => {

        if (line.trim() == '') return;

        let row = {};
        line.split(";").forEach((col, j) => {
            i === 0 ? names.push(col):  row[names[j]] = col;
        });
        if (i > 0) {
            let drugType = row[settings.drugColumnName] + row[settings.typeColumnName];
            if (drugType in drugTypeIx) {
                data[drugTypeIx[drugType]][settings.reactionColumnName] += `, ${row[settings.reactionColumnName]}`;
            } else {
                drugTypeIx[drugType] = data.length;
                data.push(row);
            }
        }
    });

    return data;
}

function uniquify(arr) {
    return arr.filter((x, i, a) => a.indexOf(x) === i);
}

function uniquifyBioentities(arr) {
    const encountered = new Set();
    const res = [];
    arr.forEach(d => {
        let ds = `${d.id}___${d.modelId}___${d.type}`;
        if (!encountered.has(ds)) {
            encountered.add(ds);
            res.push(d);
        }
    });

    return res;
}

function getDrugs(data) {
    return uniquify(data.map(d => d[settings.drugColumnName]));
}

function queryMinervaApi(query, parameters, queryType) {

    const apiAddress = ServerConnector.getApiBaseUrl();
    if (!queryType) queryType = 'GET';
    if (!parameters) parameters = '';

    return jq.ajax({
        type: queryType,
        url: `${apiAddress}${query}`,
        // dataType: 'json',
        data: parameters
    })
}

function processDSR(drugName, dsr){
    let res = [];

    if (dsr == undefined) {
        console.warn(`Issue with retrieving data for ${drugName}`);
    } else {
        dsr.forEach(d => {
            d.targets.forEach(t => {
                res = res.concat(t.targetElements);
            });
        });
    }

    return res;

}

function idIdModelId(id, modelId) {
    return `${id}____${modelId}`;
}

function getBioEntities(){
    let bioEntities = uniquifyBioentities(Object.values(globals.drugs2BioEntities).reduce((acc, val) => acc.concat(val), []));
    return minervaProxy.project.data.getBioEntityById(bioEntities).then(function (data) {
        data.forEach(e => {
            let idModelId = idIdModelId(e.getId(), e.getModelId());
            globals.idModelId2BioEntity[idModelId] = e;
        })
    });


}

function initDrugBioEntities(){

    let drugNames;

    return jq.ajax(settings.dataSource).then(function (csv) {

        globals.adrData= parseAdrCsv(csv);
        drugNames = getDrugs(globals.adrData);

        const promisses = drugNames.map(d =>
            queryMinervaApi(`projects/${minervaProxy.project.data.getProjectId()}/drugs:search?query=${d}`).catch(()=>undefined)
        );

        return Promise.all(promisses);
    }, function () {
        showModal();
        return [];
    }).then(function (drugSearchResults) {
        drugNames.forEach((dn, i) => {
            const dsrProcessed = processDSR(dn, drugSearchResults[i]);
            if (dsrProcessed.length > 0) {
                globals.drugs2BioEntities[dn] = dsrProcessed;
                dsrProcessed.forEach(bioEntity => {
                    let combinedId = idIdModelId(bioEntity.id, bioEntity.modelId);
                    if (!(combinedId in globals.bioentities2Drugs)) globals.bioentities2Drugs[combinedId] = [];
                    globals.bioentities2Drugs[combinedId].push(dn);
                });
            }
        });

        globals.adrDataMap = globals.adrData.filter(d => d[settings.drugColumnName] in globals.drugs2BioEntities);
    }).then(function () {
        return getBioEntities();
    }).then(function () {
        globals.adrDataMap.forEach(d => {
            d['EntityId'] = globals.drugs2BioEntities[d[settings.drugColumnName]].map(e => idIdModelId(e.id, e.modelId));
            d['Entity'] = uniquify(globals.drugs2BioEntities[d[settings.drugColumnName]]
                .map(e => globals.idModelId2BioEntity[idIdModelId(e.id, e.modelId)])
                .map(be => be.getName()))
                .reduce((acc, val) => `${acc}, ${val}` , '').replace(/^,/, '');
        });
    });
}

function highlightSelectedInTable(){

    // $container.find(`td`).parent().removeClass('danger');
    if (Object.keys(globals.adrDataMap).length > 0) {

        $adrTable.find('tbody tr').each(function () {
            let rowId = $(this).data('index');
            $adrTable.bootstrapTable('updateCell', {index: rowId, field: 'State', value: 1, reinit: false});
        });

        $adrTable.bootstrapTable('updateCell', {index: 0, field: 'State', value: 1}); //to trigger reinitialization
    }


    if (selectedInMap){
        let idModelId = idIdModelId(selectedInMap.getId(), selectedInMap.getModelId());
        let $tr = $adrTable.find(`td:contains("${idModelId}")`).parent();
        // $tr.addClass('danger');
        $tr.each(function () {
            let rowId = $(this).data('index');
            $adrTable.bootstrapTable('updateCell', {index: rowId, field: 'State', value: 0});
        });
        if ($tr.length > 0){
            $adrTable.find('th[data-field="Drug"] .sortable').click();
            $adrTable.find('th[data-field="State"] .sortable').click();
        }
    }
}

function searchListener(entities) {
    selectedInMap = undefined;
    if (entities[0].length > 0 && entities[0][0].constructor.name === 'Alias') {
        selectedInMap = entities[0][0];
    }
    highlightSelectedInTable();
}


function isString(s) {
    return typeof(s) === 'string' || s instanceof String;
}


function showModal() {
    pluginContainer.find(".modal").modal('show');
}

function setTableHeight($table) {
    let $ftb = $table.closest('.fixed-table-body');
    let top = $ftb.offset().top;
    $ftb.css('height', `calc(100vh - ${top}px - 20px)`);
}

function highlightGeneOccurrences(geneName){
    return deHighlightAll().then(function () {
        let bioEntities = globals.gene2BioEntities[geneName];
        let highlightDefs = bioEntities.map(e => {
            return {
                element: {
                    id: e.id,
                    modelId: e.modelId,
                    type: "ALIAS"
                },
                type: "ICON"
            };
        });
        return minervaProxy.project.map.showBioEntity(highlightDefs);
    });
}

function registerTableEvents(){
    pluginContainer.find('.variation-table .glyphicon-eye-open').each((i, e) =>{
        e.onclick = function () {
            highlightGeneOccurrences(e.dataset.gene);
        };
    });
}