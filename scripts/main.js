Hooks.once('init', () => {
    game.settings.register('pf1-resistance-check', 'enableCheck', {
        name: 'Check enabled',
        hint: 'Client setting to enable the module. If disabled, all the below settings are ignored.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('pf1-resistance-check', 'checkdr', {
        name: 'Damage Reduction Check',
        hint: 'Enable the module to check for Damage Reduction on the sheet',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('pf1-resistance-check', 'checkdi', {
        name: 'Damage Immunity Check',
        hint: 'Enable the module to check for Damage Immunity on the sheet',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('pf1-resistance-check', 'checkdv', {
        name: 'Damage Vulnerability Check',
        hint: 'Enable the module to check for Damage Vulnerability on the sheet',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('pf1-resistance-check', 'checkeres', {
        name: 'Energy Resistance Check',
        hint: 'Enable the module to check for Energy Resistance on the sheet',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('pf1-resistance-check', 'checkcr', {
        name: 'Condition Resistance Check',
        hint: 'Enable the module to check for Condition Resistance on the sheet',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register('pf1-resistance-check', 'checkci', {
        name: 'Condition Immunity Check',
        hint: 'Enable the module to check for Condition Immunity on the sheet',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
    });

    libWrapper.register('pf1-resistance-check', 'pf1.documents.actor.ActorPF.applyDamage', function (wrapped, ...args) {
        if (game.settings.get('pf1-resistance-check', 'enableCheck')) {
            const relevantKeys = ['dr', 'di', 'dv', 'eres', 'cr', 'ci'];
            const keysToCheck = [];

            for (const key of relevantKeys) {
                if (game.settings.get('pf1-resistance-check', `check${key}`)) {
                    keysToCheck.push(key);
                }
            }

            const emptyIWR = {
                'dr': {
                    'value': [],
                    'custom': ''
                },
                'eres': {
                    'value': [],
                    'custom': ''
                },
                'cres': '',
                'di': {
                    'value': [],
                    'custom': ''
                },
                'dv': {
                    'value': [],
                    'custom': ''
                },
                'ci': {
                    'value': [],
                    'custom': ''
                }
            };
            let forceDialog = false;

            if (event.shiftKey && !event.ctrlKey) {
                forceDialog = false;
            }
            else if (event.shiftKey && event.ctrlKey) {
                forceDialog = false;
            }
            else {
                for (const token of canvas.tokens.controlled) {
                    if (Object.keys(diffObject(emptyIWR, token.actor?.system.traits)).some(o => keysToCheck.includes(o))) {
                        forceDialog = true;
                        break;
                    }
                }
            }

            if (forceDialog) {
                args[1]['forceDialog'] = true;
            }
        }
        let result = wrapped(...args);
        return result;
    });
});