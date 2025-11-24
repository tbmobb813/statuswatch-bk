/* eslint-disable @typescript-eslint/no-explicit-any */
import processStatusChange from '../../src/services/status-change.processor';

describe('processStatusChange', () => {
  test('creates incident and notifies when service degrades', async () => {
    const mockNotify = jest.fn().mockResolvedValue(undefined);
    const mockPrisma = {
      incident: {
        create: jest.fn().mockResolvedValue({}),
      }
    } as unknown as { incident: { create: jest.Mock } };

    const service = {
      id: 'svc-1',
      name: 'Service One',
      statusChecks: [
        { isUp: false, checkedAt: new Date() }, // current
        { isUp: true, checkedAt: new Date(Date.now() - 1000) } // previous
      ]
    };

    const currentStatus = { slug: 'service-one', message: 'ping failed' };

  await processStatusChange(service as any, currentStatus as any, { notificationService: { notifyStatusChange: mockNotify }, prismaClient: mockPrisma as any });

    expect(mockNotify).toHaveBeenCalledWith('svc-1', 'operational', 'outage', 'ping failed');
    expect(mockPrisma.incident.create).toHaveBeenCalled();
  });

  test('resolves incidents and notifies when service recovers', async () => {
    const mockNotify = jest.fn().mockResolvedValue(undefined);
    const mockPrisma = {
      incident: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      }
    } as unknown as { incident: { updateMany: jest.Mock } };

    const service = {
      id: 'svc-2',
      name: 'Service Two',
      statusChecks: [
        { isUp: true, checkedAt: new Date() }, // current
        { isUp: false, checkedAt: new Date(Date.now() - 1000) } // previous
      ]
    };

    const currentStatus = { slug: 'service-two', message: 'recovered' };

  await processStatusChange(service as any, currentStatus as any, { notificationService: { notifyStatusChange: mockNotify }, prismaClient: mockPrisma as any });

    expect(mockNotify).toHaveBeenCalledWith('svc-2', 'outage', 'operational', 'recovered');
    expect(mockPrisma.incident.updateMany).toHaveBeenCalled();
  });
});
