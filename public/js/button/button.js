import { usePayPalPromise } from './promise';
import { detectLightboxEligibility, enableLightbox } from './lightbox';
import { determineLocale } from './locale';
import { persistAccessToken } from './user';
import {
    setupLoginPreRender,
    getAccessToken,
    shouldPrefetchLogin
} from './login';
import { renderCardExperience } from './card';
import { renderCheckout } from './checkout';
import { KEY_CODES } from './constants';
import { getButtonFunding } from './api';
import { querySelectorAll } from './util';
import { payment, guestEligibilityCheck } from './paymentRequest';

function clickButton(event, { fundingSource = 'paypal', card }) {
    event.preventDefault();
    event.stopPropagation();

    if (shouldPrefetchLogin()) {
        enableLightbox();
        let accessTokenGetter = getAccessToken();
        accessTokenGetter.then(accessToken => {
            persistAccessToken(accessToken);
        });

        return renderCheckout({
            accessToken: () => accessTokenGetter,
            onDisplay: () => accessTokenGetter
        });
    }

    if (!card) {
        renderCheckout({ fundingSource });
    } else {
        window.xprops
            .payment()
            .then(accessToken => {
                persistAccessToken(accessToken);
                return accessToken;
            })
            .then(accessToken => {
                // make API call to check flow eligibility
                return guestEligibilityCheck({ token: accessToken });
            })
            .then(res => res.json())
            .then(res => {
                console.log('res', res);
                return res.data.guestFlowCheck;
            })
            .then(({ isHostFieldAllowed, isGuestAllowed }) => {
                if (isHostFieldAllowed) {
                    // render zombo
                    renderCardExperience({ fundingSource, card });
                    return;
                }

                if (isGuestAllowed) {
                    // use request payment api
                    // payment.show();
                    payment.canMakePayment().then(isAvailable => {
                        if (isAvailable) {
                            payment.show();
                        } else {
                            // go to xoon guest checkout
                            renderCheckout({ fundingSource });
                        }
                    });
                    return;
                }

                // TODO: render a button to go to xoon since we cannot open
                // new popup because this check is asynchonous
                // go to xoon signup
                renderCheckout({ fundingSource });
            });
    }

    if (window.xprops.onClick) {
        window.xprops.onClick({ fundingSource, card });
    }
}

export function setupButton() {
    if (window.name && window.name.indexOf('__prerender') === 0) {
        if (window.console && window.console.warn) {
            window.console.warn('Button setup inside prerender');
        }
        return;
    }

    if (
        !window.paypal &&
        (!window.name || window.name.indexOf('xcomponent__ppbutton') === -1)
    ) {
        return;
    }

    usePayPalPromise();
    setupLoginPreRender();

    querySelectorAll('.paypal-button').forEach(button => {
        let fundingSource = button.getAttribute('data-funding-source');
        let card = button.getAttribute('data-card');

        button.addEventListener('click', event => {
            return clickButton(event, { fundingSource, card });
        });

        button.addEventListener('keypress', event => {
            if (event.keyCode === KEY_CODES.ENTER) {
                return clickButton(event, { fundingSource, card });
            }
        });
    });

    return window.paypal.Promise.all([
        detectLightboxEligibility(),

        determineLocale().then(locale => {
            window.paypal.config.locale.country = locale.country;
            window.paypal.config.locale.lang = locale.lang;
        }),

        getButtonFunding().then(funding => {
            if (
                window.xprops.funding &&
                window.xprops.funding.remember &&
                funding.eligible.length
            ) {
                window.xprops.funding.remember(funding.eligible);
            }
        })
    ]);
}
