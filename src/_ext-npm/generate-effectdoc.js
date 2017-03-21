
import * as _ from 'lodash';

import * as fs from 'fs';

import { SPECIAL_STATS_BASE, ATTACK_STATS_BASE } from '../shared/stat-calculator';

let docString = `
# IdleLands Equipment Effects
`;

docString += '\n\n';

docString += '## Special Stats\n\n';

docString += 'Name | Description\n';
docString += '---- | -----------\n';

_.each(SPECIAL_STATS_BASE, ({ name, desc }) => {
  if (desc.length) docString += `${name} | ${desc}\n`;
});

docString += '\n\n';

docString += '## Attack Stats\n\n';

docString += 'Name | Description\n';
docString += '---- | -----------\n';

_.each(ATTACK_STATS_BASE, ({ name, desc }) => {
  docString += `${name} | ${desc}\n`;
});


fs.writeFileSync('docs/EFFECTS.md', docString);