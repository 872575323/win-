/**
 * StealthController 单元测试
 * 验证窗口显隐控制的核心功能：show / hide / toggle / isVisible / 鼠标轮询
 * 需求：2.1, 2.2, 2.3, 2.4, 2.5
 */

import { createMockBrowserWindow, MockBrowserWindow } from '../helpers';

// 模拟 screen.getCursorScreenPoint
const mockGetCursorScreenPoint = jest.fn().mockReturnValue({ x: 400, y: 300 });

jest.mock('electron', () => ({
  screen: {
    getCursorScreenPoint: mockGetCursorScreenPoint,
  },
}));

import { StealthController } from '../../src/main/stealth-controller';

describe('StealthController', () => {
  let mockWindow: MockBrowserWindow;
  let controller: StealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockWindow = createMockBrowserWindow();
    // 设置窗口 bounds 为 (100, 100, 800, 600)
    mockWindow.getBounds.mockReturnValue({ x: 100, y: 100, width: 800, height: 600 });
    // autoStart = false，手动控制轮询
    controller = new StealthController(mockWindow as any, false);
  });

  afterEach(() => {
    controller.stopPolling();
    jest.useRealTimers();
  });

  describe('初始状态', () => {
    it('默认应为可见状态', () => {
      expect(controller.isVisible()).toBe(true);
    });
  });

  describe('show()', () => {
    it('应将窗口不透明度设置为 1.0', () => {
      controller.hide();
      controller.show();
      expect(mockWindow.setOpacity).toHaveBeenLastCalledWith(1.0);
    });

    it('应关闭点击穿透', () => {
      controller.hide();
      controller.show();
      expect(mockWindow.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false);
    });

    it('调用后 isVisible 应返回 true', () => {
      controller.hide();
      controller.show();
      expect(controller.isVisible()).toBe(true);
    });
  });

  describe('hide()', () => {
    it('应将窗口不透明度设置为极低值 0.01', () => {
      controller.hide();
      expect(mockWindow.setOpacity).toHaveBeenCalledWith(0.01);
    });

    it('应开启点击穿透并转发鼠标事件', () => {
      controller.hide();
      expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
    });

    it('调用后 isVisible 应返回 false', () => {
      controller.hide();
      expect(controller.isVisible()).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('可见状态下调用应隐藏窗口', () => {
      expect(controller.isVisible()).toBe(true);
      controller.toggle();
      expect(controller.isVisible()).toBe(false);
      expect(mockWindow.setOpacity).toHaveBeenCalledWith(0.01);
    });

    it('隐藏状态下调用应显示窗口', () => {
      controller.hide();
      jest.clearAllMocks();
      controller.toggle();
      expect(controller.isVisible()).toBe(true);
      expect(mockWindow.setOpacity).toHaveBeenCalledWith(1.0);
    });

    it('连续两次 toggle 应回到初始状态', () => {
      const initialState = controller.isVisible();
      controller.toggle();
      controller.toggle();
      expect(controller.isVisible()).toBe(initialState);
    });
  });

  describe('鼠标位置轮询', () => {
    it('鼠标在窗口内时应显示窗口', () => {
      // 先隐藏窗口
      controller.hide();
      expect(controller.isVisible()).toBe(false);

      // 鼠标在窗口范围内 (400, 300) 在 (100,100)-(900,700) 内
      mockGetCursorScreenPoint.mockReturnValue({ x: 400, y: 300 });

      controller.startPolling();
      jest.advanceTimersByTime(150);

      expect(controller.isVisible()).toBe(true);
    });

    it('鼠标在窗口外时应隐藏窗口', () => {
      // 窗口当前可见
      expect(controller.isVisible()).toBe(true);

      // 鼠标在窗口范围外
      mockGetCursorScreenPoint.mockReturnValue({ x: 50, y: 50 });

      controller.startPolling();
      jest.advanceTimersByTime(150);

      expect(controller.isVisible()).toBe(false);
    });

    it('鼠标从窗口外移入窗口内应触发显示', () => {
      // 鼠标先在外面
      mockGetCursorScreenPoint.mockReturnValue({ x: 0, y: 0 });
      controller.startPolling();
      jest.advanceTimersByTime(150);
      expect(controller.isVisible()).toBe(false);

      // 鼠标移入窗口
      mockGetCursorScreenPoint.mockReturnValue({ x: 500, y: 400 });
      jest.advanceTimersByTime(150);
      expect(controller.isVisible()).toBe(true);
    });
  });

  describe('防御性检查', () => {
    it('窗口已销毁时 show() 不应抛出异常', () => {
      const destroyedWindow = createMockBrowserWindow({
        isDestroyed: jest.fn(() => true),
      });
      const ctrl = new StealthController(destroyedWindow as any, false);
      expect(() => ctrl.show()).not.toThrow();
      expect(destroyedWindow.setOpacity).not.toHaveBeenCalled();
    });

    it('窗口已销毁时 hide() 不应抛出异常', () => {
      const destroyedWindow = createMockBrowserWindow({
        isDestroyed: jest.fn(() => true),
      });
      const ctrl = new StealthController(destroyedWindow as any, false);
      expect(() => ctrl.hide()).not.toThrow();
      expect(destroyedWindow.setOpacity).not.toHaveBeenCalled();
    });

    it('窗口为 null 时不应抛出异常', () => {
      const ctrl = new StealthController(() => null, false);
      expect(() => ctrl.show()).not.toThrow();
      expect(() => ctrl.hide()).not.toThrow();
      expect(() => ctrl.toggle()).not.toThrow();
    });
  });

  describe('getter 函数模式', () => {
    it('应支持通过 getter 函数获取窗口实例', () => {
      const getter = () => mockWindow as any;
      const ctrl = new StealthController(getter, false);
      ctrl.hide();
      expect(mockWindow.setOpacity).toHaveBeenCalledWith(0.01);
      expect(ctrl.isVisible()).toBe(false);
    });
  });
});
