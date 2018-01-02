const log = (params) => {
    window.console.info(params);
};

export function renderCardExperience(props = {}) {
    window.paypal.Card.render({
        tag: 'zombo',
        url: 'http://localhost:3000/',
        dimensions: {
            width: '300px',
            height: '600px',
        },

        payment: window.xprops.payment,

        locale: window.xprops.locale,
        commit: window.xprops.commit,

        onError: window.xprops.onError,

        onAuthorize(data, actions) {
            log('onAuthorize', data, actions);
        },

        onCancel(data, actions) {
            log('onCancel', data, actions);
        },

        onAuth(data) {
            log('onAuth:', data);
        },

        style: {
            overlayColor: window.xprops.style.overlayColor
        },

        ...props
    }, document.getElementById('cardExp'));
}

