const createFocusGroup = require('focus-group');
const externalStateControl = require('./externalStateControl');

const focusGroupOptions = {
  wrap: true,
  stringSearch: true
};

const protoManager = {
  init(options) {
    this.options = options || {};

    if (typeof this.options.closeOnSelection === 'undefined') {
      this.options.closeOnSelection = true;
    }

    if (typeof this.options.closeOnBlur === 'undefined') {
      this.options.closeOnBlur = true;
    }

    if (this.options.id) {
      externalStateControl.registerManager(this.options.id, this);
    }

    this.handleBlur = handleBlur.bind(this);
    this.handleSelection = handleSelection.bind(this);
    this.handleMenuKey = handleMenuKey.bind(this);

    // "With focus on the drop-down menu, the Up and Down Arrow
    // keys move focus within the menu items, "wrapping" at the top and bottom."
    // "Typing a letter (printable character) key moves focus to the next
    // instance of a visible node whose title begins with that printable letter."
    //
    // All of the above is handled by focus-group.
    this.focusGroup = createFocusGroup(focusGroupOptions);

    // These component references are added when the relevant components mount
    this.button = null;
    this.menu = null;

    // State trackers
    this.isOpen = false;
  },

  focusItem(index) {
    this.focusGroup.focusNodeAtIndex(index);
  },

  addItem(item) {
    this.focusGroup.addMember(item);
  },

  clearItems() {
    this.focusGroup.clearMembers();
  },

  handleButtonNonArrowKey(event) {
    this.focusGroup._handleUnboundKey(event);
  },

  destroy() {
    this.button = null;
    this.menu = null;
    this.focusGroup.deactivate();
    clearTimeout(this.blurTimer);
    clearTimeout(this.moveFocusTimer);
  },

  update() {
    this.menu.setState({ isOpen: this.isOpen });
    this.button.setState({ menuOpen: this.isOpen });
    this.options.onMenuToggle &&
      this.options.onMenuToggle({ isOpen: this.isOpen });
  },

  openMenu(openOptions) {
    if (this.isOpen) return;
    openOptions = openOptions || {};
    if (openOptions.focusMenu === undefined) {
      openOptions.focusMenu = true;
    }
    this.isOpen = true;
    this.update();
    this.focusGroup.activate();
    if (openOptions.focusMenu) {
      const self = this;
      this.moveFocusTimer = setTimeout(function() {
        self.focusItem(0);
      }, 0);
    }
  },

  closeMenu(closeOptions) {
    if (!this.isOpen) return;
    closeOptions = closeOptions || {};
    this.isOpen = false;
    this.update();
    if (closeOptions.focusButton) {
      this.button.ref.current.focus();
    }
  },

  toggleMenu(closeOptions, openOptions) {
    closeOptions = closeOptions || {};
    openOptions = openOptions || {};
    if (this.isOpen) {
      this.closeMenu(closeOptions);
    } else {
      this.openMenu(openOptions);
    }
  }
};

function handleBlur() {
  const self = this;
  self.blurTimer = setTimeout(function() {
    if (!self.button) return;
    const buttonNode = self.button.ref.current;
    if (!buttonNode) return;
    const activeEl = buttonNode.ownerDocument.activeElement;
    if (buttonNode && activeEl === buttonNode) return;
    const menuNode = self.menu.ref.current;
    if (menuNode === activeEl) {
      self.focusItem(0);
      return;
    }
    if (menuNode && menuNode.contains(activeEl)) return;
    if (self.isOpen) self.closeMenu({ focusButton: false });
  }, 0);
}

function handleSelection(value, event) {
  if (this.options.closeOnSelection) this.closeMenu({ focusButton: true });
  if (this.options.onSelection) this.options.onSelection(value, event);
}

function handleMenuKey(event) {
  if (this.isOpen) {
    switch (event.key) {
      // With focus on the drop-down menu, pressing Escape closes
      // the menu and returns focus to the button.
      case 'Escape':
        event.preventDefault();
        this.closeMenu({ focusButton: true });
        break;
      case 'Home':
        event.preventDefault();
        this.focusGroup.moveFocusToFirst();
        break;
      case 'End':
        event.preventDefault();
        this.focusGroup.moveFocusToLast();
        break;
    }
  }
}

module.exports = function(options) {
  const newManager = Object.create(protoManager);
  newManager.init(options);
  return newManager;
};
