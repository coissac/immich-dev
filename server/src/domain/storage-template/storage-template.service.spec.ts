import { AssetPathType } from '@app/infra/entities';
import {
  assetStub,
  newAlbumRepositoryMock,
  newAssetRepositoryMock,
  newMoveRepositoryMock,
  newPersonRepositoryMock,
  newStorageRepositoryMock,
  newSystemConfigRepositoryMock,
  newUserRepositoryMock,
  userStub,
} from '@test';
import { when } from 'jest-when';
import {
  IAlbumRepository,
  IAssetRepository,
  IMoveRepository,
  IPersonRepository,
  IStorageRepository,
  ISystemConfigRepository,
  IUserRepository,
} from '../repositories';
import { defaults } from '../system-config/system-config.core';
import { StorageTemplateService } from './storage-template.service';

describe(StorageTemplateService.name, () => {
  let sut: StorageTemplateService;
  let albumMock: jest.Mocked<IAlbumRepository>;
  let assetMock: jest.Mocked<IAssetRepository>;
  let configMock: jest.Mocked<ISystemConfigRepository>;
  let moveMock: jest.Mocked<IMoveRepository>;
  let personMock: jest.Mocked<IPersonRepository>;
  let storageMock: jest.Mocked<IStorageRepository>;
  let userMock: jest.Mocked<IUserRepository>;

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  beforeEach(async () => {
    assetMock = newAssetRepositoryMock();
    albumMock = newAlbumRepositoryMock();
    configMock = newSystemConfigRepositoryMock();
    moveMock = newMoveRepositoryMock();
    personMock = newPersonRepositoryMock();
    storageMock = newStorageRepositoryMock();
    userMock = newUserRepositoryMock();

    sut = new StorageTemplateService(
      albumMock,
      assetMock,
      configMock,
      defaults,
      moveMock,
      personMock,
      storageMock,
      userMock,
    );
  });

  describe('handleMigrationSingle', () => {
    it('should migrate single moving picture', async () => {
      userMock.get.mockResolvedValue(userStub.user1);
      const path = (id: string) => `upload/library/${userStub.user1.id}/2023/2023-02-23/${id}.jpg`;
      const newPath = (id: string) => `upload/library/${userStub.user1.id}/2023/2023-02-23/${id}+1.jpg`;

      when(storageMock.checkFileExists).calledWith(path(assetStub.livePhotoStillAsset.id)).mockResolvedValue(true);
      when(storageMock.checkFileExists).calledWith(newPath(assetStub.livePhotoStillAsset.id)).mockResolvedValue(false);

      when(storageMock.checkFileExists).calledWith(path(assetStub.livePhotoMotionAsset.id)).mockResolvedValue(true);
      when(storageMock.checkFileExists).calledWith(newPath(assetStub.livePhotoMotionAsset.id)).mockResolvedValue(false);

      when(assetMock.save)
        .calledWith({ id: assetStub.livePhotoStillAsset.id, originalPath: newPath(assetStub.livePhotoStillAsset.id) })
        .mockResolvedValue(assetStub.livePhotoStillAsset);

      when(assetMock.save)
        .calledWith({ id: assetStub.livePhotoMotionAsset.id, originalPath: newPath(assetStub.livePhotoMotionAsset.id) })
        .mockResolvedValue(assetStub.livePhotoMotionAsset);

      when(assetMock.getByIds)
        .calledWith([assetStub.livePhotoStillAsset.id])
        .mockResolvedValue([assetStub.livePhotoStillAsset]);

      when(assetMock.getByIds)
        .calledWith([assetStub.livePhotoMotionAsset.id])
        .mockResolvedValue([assetStub.livePhotoMotionAsset]);

      await expect(sut.handleMigrationSingle({ id: assetStub.livePhotoStillAsset.id })).resolves.toBe(true);

      expect(assetMock.getByIds).toHaveBeenCalledWith([assetStub.livePhotoStillAsset.id]);
      expect(assetMock.getByIds).toHaveBeenCalledWith([assetStub.livePhotoMotionAsset.id]);
    });
  });

  describe('handle template migration', () => {
    it('should handle no assets', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [],
        hasNextPage: false,
      });
      userMock.getList.mockResolvedValue([]);

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
    });

    it('should handle an asset with a duplicate destination', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });
      assetMock.save.mockResolvedValue(assetStub.image);
      userMock.getList.mockResolvedValue([userStub.user1]);
      moveMock.create.mockResolvedValue({
        id: '123',
        entityId: assetStub.image.id,
        pathType: AssetPathType.ORIGINAL,
        oldPath: assetStub.image.originalPath,
        newPath: 'upload/library/user-id/2023/2023-02-23/asset-id+1.jpg',
      });

      when(storageMock.checkFileExists)
        .calledWith('upload/library/user-id/2023/2023-02-23/asset-id.jpg')
        .mockResolvedValue(true);

      when(storageMock.checkFileExists)
        .calledWith('upload/library/user-id/2023/2023-02-23/asset-id+1.jpg')
        .mockResolvedValue(false);

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
      expect(storageMock.checkFileExists).toHaveBeenCalledTimes(2);
      expect(assetMock.save).toHaveBeenCalledWith({
        id: assetStub.image.id,
        originalPath: 'upload/library/user-id/2023/2023-02-23/asset-id+1.jpg',
      });
      expect(userMock.getList).toHaveBeenCalled();
    });

    it('should skip when an asset already matches the template', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [
          {
            ...assetStub.image,
            originalPath: 'upload/library/user-id/2023/2023-02-23/asset-id.jpg',
          },
        ],
        hasNextPage: false,
      });
      userMock.getList.mockResolvedValue([userStub.user1]);

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
      expect(storageMock.moveFile).not.toHaveBeenCalled();
      expect(storageMock.checkFileExists).not.toHaveBeenCalledTimes(2);
      expect(assetMock.save).not.toHaveBeenCalled();
    });

    it('should skip when an asset is probably a duplicate', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [
          {
            ...assetStub.image,
            originalPath: 'upload/library/user-id/2023/2023-02-23/asset-id+1.jpg',
          },
        ],
        hasNextPage: false,
      });
      userMock.getList.mockResolvedValue([userStub.user1]);

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
      expect(storageMock.moveFile).not.toHaveBeenCalled();
      expect(storageMock.checkFileExists).not.toHaveBeenCalledTimes(2);
      expect(assetMock.save).not.toHaveBeenCalled();
    });

    it('should move an asset', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });
      assetMock.save.mockResolvedValue(assetStub.image);
      userMock.getList.mockResolvedValue([userStub.user1]);
      moveMock.create.mockResolvedValue({
        id: '123',
        entityId: assetStub.image.id,
        pathType: AssetPathType.ORIGINAL,
        oldPath: assetStub.image.originalPath,
        newPath: 'upload/library/user-id/2023/2023-02-23/asset-id.jpg',
      });

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
      expect(storageMock.moveFile).toHaveBeenCalledWith(
        '/original/path.jpg',
        'upload/library/user-id/2023/2023-02-23/asset-id.jpg',
      );
      expect(assetMock.save).toHaveBeenCalledWith({
        id: assetStub.image.id,
        originalPath: 'upload/library/user-id/2023/2023-02-23/asset-id.jpg',
      });
    });

    it('should use the user storage label', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });
      assetMock.save.mockResolvedValue(assetStub.image);
      userMock.getList.mockResolvedValue([userStub.storageLabel]);
      moveMock.create.mockResolvedValue({
        id: '123',
        entityId: assetStub.image.id,
        pathType: AssetPathType.ORIGINAL,
        oldPath: assetStub.image.originalPath,
        newPath: 'upload/library/user-id/2023/2023-02-23/asset-id.jpg',
      });

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
      expect(storageMock.moveFile).toHaveBeenCalledWith(
        '/original/path.jpg',
        'upload/library/label-1/2023/2023-02-23/asset-id.jpg',
      );
      expect(assetMock.save).toHaveBeenCalledWith({
        id: assetStub.image.id,
        originalPath: 'upload/library/label-1/2023/2023-02-23/asset-id.jpg',
      });
    });

    it('should not update the database if the move fails', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [assetStub.image],
        hasNextPage: false,
      });
      storageMock.moveFile.mockRejectedValue(new Error('Read only system'));
      moveMock.create.mockResolvedValue({
        id: 'move-123',
        entityId: '123',
        pathType: AssetPathType.ORIGINAL,
        oldPath: assetStub.image.originalPath,
        newPath: '',
      });
      userMock.getList.mockResolvedValue([userStub.user1]);

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
      expect(storageMock.moveFile).toHaveBeenCalledWith(
        '/original/path.jpg',
        'upload/library/user-id/2023/2023-02-23/asset-id.jpg',
      );
      expect(assetMock.save).not.toHaveBeenCalled();
    });

    it('should not move read-only asset', async () => {
      assetMock.getAll.mockResolvedValue({
        items: [
          {
            ...assetStub.image,
            originalPath: 'upload/library/user-id/2023/2023-02-23/asset-id+1.jpg',
            isReadOnly: true,
          },
        ],
        hasNextPage: false,
      });
      assetMock.save.mockResolvedValue(assetStub.image);
      userMock.getList.mockResolvedValue([userStub.user1]);

      await sut.handleMigration();

      expect(assetMock.getAll).toHaveBeenCalled();
      expect(storageMock.moveFile).not.toHaveBeenCalled();
      expect(assetMock.save).not.toHaveBeenCalled();
    });
  });
});
