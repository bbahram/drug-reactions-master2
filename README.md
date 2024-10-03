# Drug reactions

`Drug reactions` is a plugin which allows one to explore adverse reactions of drugs which 
 are interacting with entities present in given disease map. 
 
 **Please bear in mind that the mapping between drugs and entities in the map
  is based on HGNC symbols. Thus, if entities in the map do not contain HGNC annotations, 
 there will be no mapping available, i.e. you won't see any drugs in the table and icons in the map.** 

### General instructions

In order to use the precompiled and publicly available version of the plugin, 
open the plugin menu in the MINERVA's upper left corner (see image below) and click plugins.
In the dialog which appears enter the following address in the URL box: 
`https://minerva-dev.lcsb.uni.lu/plugins/drug-reactions/plugin.js` .
The plugin shows up in the plugins panel on the right hand side of the screen.

### Plugin functionality

- On plugin load, the plugin connects to a data source with drug-reactions information.
- Next, MINERVA's [drug search API](https://minerva.pages.uni.lu/doc/api/12.1/projects/#drugs) 
is used to retrieve the information about species in map interacting with any of the
 drugs in the previously loaded data source (MINERVA does the mapping based on HGNC annotations). 
- The data is loaded into a table in the plugin space and the species which interact
with the uploaded drugs are highlighted by icons in the map.
- The table is searchable and automatically synchronized with highlights in the map, so where the content of
the table is updated the highlighted entities in the map update as well.

### Data resources

The original source of dat an the plugin are [drug labels](https://osf.io/9hsxq/) 
(prescribing information or package inserts) manually 
annotated for adverse drug reactions and mapped to MedDRA for the FDA TAC 2017 evaluation.
However, in order to decrease the required bandwidth, the plugin uses a [modified version](https://git-r3lab.uni.lu/minerva/plugins/drug-reactions/tree/master/data)
of this file where only the relevant columns are kept.