"use strict";

import { getHeaderTitle, HeaderShownContext } from '@react-navigation/elements';
import { StackActions } from '@react-navigation/native';
import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalPresentationContext } from "../../utils/ModalPresentationContext.js";
import { throttle } from "../../utils/throttle.js";
import { HeaderSegment } from "./HeaderSegment.js";
import { jsx as _jsx } from "react/jsx-runtime";
export const Header = /*#__PURE__*/React.memo(function Header({
  back,
  layout,
  progress,
  options,
  route,
  navigation,
  styleInterpolator
}) {
  const insets = useSafeAreaInsets();
  let previousTitle;

  // The label for the left back button shows the title of the previous screen
  // If a custom label is specified, we use it, otherwise use previous screen's title
  if (options.headerBackTitle !== undefined) {
    previousTitle = options.headerBackTitle;
  } else if (back) {
    previousTitle = back.title;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goBack = React.useCallback(throttle(() => {
    if (navigation.isFocused() && navigation.canGoBack()) {
      navigation.dispatch({
        ...StackActions.pop(),
        source: route.key
      });
    }
  }, 50), [navigation, route.key]);
  const isModal = React.useContext(ModalPresentationContext);
  const isParentHeaderShown = React.useContext(HeaderShownContext);
  const statusBarHeight = options.headerStatusBarHeight !== undefined ? options.headerStatusBarHeight : isModal || isParentHeaderShown ? 0 : insets.top;
  return /*#__PURE__*/_jsx(HeaderSegment, {
    ...options,
    title: getHeaderTitle(options, route.name),
    progress: progress,
    layout: layout,
    modal: isModal,
    headerBackTitle: options.headerBackTitle !== undefined ? options.headerBackTitle : previousTitle,
    headerStatusBarHeight: statusBarHeight,
    onGoBack: back ? goBack : undefined,
    backHref: back ? back.href : undefined,
    styleInterpolator: styleInterpolator
  });
});
//# sourceMappingURL=Header.js.map