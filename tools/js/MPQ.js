// Blizzard MPQ Archive on JS

const MPQLocales = {
    def: 0, // neutral
    zhCN: 0x404, // Chinese
    csCZ: 0x405, // Czech
    deDE: 0x407, // German
    enUS: 0x409, // English
    esES: 0x40a, // Spanish
    frFR: 0x40c, // French
    itIT: 0x410, // Italian
    jaJA: 0x411, // Japanese
    koKR: 0x412, // Korean
    nlNL: 0x413, // Dutch
    plPL: 0x415, // Polish
    ptPT: 0x416, // Portuguese
    ruRU: 0x419, // Russian
    enUK: 0x809 // English (UK)
}

const MPQ_FILE_IMPLODE 			    = 0x00000100;
const MPQ_FILE_COMPRESS 		    = 0x00000200;
const MPQ_FILE_ENCRYPTED 		    = 0x00010000;
const MPQ_FILE_FIX_KEY			    = 0x00020000;
const MPQ_FILE_SINGLE_UNIT		    = 0x01000000;
const MPQ_FILE_DELETE_MARKER        = 0x02000000;
const MPQ_FILE_SECTOR_CRC	 	    = 0x04000000;
const MPQ_FILE_EXISTS		 	    = 0x80000000;

class MPQ {
    constructor(files, listfile=true, lang="def") {
        this.files = files
        this.listfile = listfile
        this.lang = MPQLocales[lang]
        if (this.files === undefined) {
            throw new Error('files is required');
        }
        if (typeof this.files === 'string') {
            this.files = [this.files];
        }
    }

    create() {
        
    }

    read() {
        
    }
}