// Icons are decorative in tests; the real ones ship as ES modules Jest does not load.
const { View } = require('react-native');

function Icon() {
  return <View testID="icon" />;
}

module.exports = { __esModule: true, default: Icon };
